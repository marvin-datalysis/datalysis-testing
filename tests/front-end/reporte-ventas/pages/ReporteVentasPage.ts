// (POM) del Reporte de Ventas
// Encargado de la navegación, espera de carga y lectura de la tabla

import { Page, Locator, expect } from '@playwright/test';

export default class ReporteVentasPage {
  constructor(private page: Page) {}

  // Navega directamente al modulo de Reporte de Ventas
  async ir(baseURL: string) {
    await this.page.goto(`${baseURL}/reportes/ventas`);
  }

  // Espera que la tabla esté lista (Mmm revisar)
async esperarLista() {
  // 1) Tolerar cargas/redirecciones
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForLoadState('networkidle').catch(() => {});

  // 2) Si hay spinner conocido, espera a que se vaya (ignora si no existe)
  const spinner = this.page.locator('[data-testid="loading-spinner"], .MuiCircularProgress-root');
  await spinner.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});

  // 3) Localizadores posibles para la tabla
  const byRoleTable   = this.page.getByRole('table');
  const byRoleGrid    = this.page.getByRole('grid');         // muchas tablas MUI usan grid
  const byTagTable    = this.page.locator('table');           // fallback genérico

  // 4) Espera a que alguno exista y sea visible
  const found =
    (await byRoleTable.count())  ? byRoleTable  :
    (await byRoleGrid.count())   ? byRoleGrid   :
    (await byTagTable.count())   ? byTagTable   :
    null;

  if (!found) {
    // Ayuda de diagnóstico
    const url = this.page.url();
    throw new Error(`No encontré tabla en la página. URL actual: ${url}`);
  }

  await found.first().waitFor({ state: 'visible', timeout: 15000 });

  // 5) Encabezados visibles (si existen)
  const headers = this.page.getByRole('columnheader');
  if (await headers.count()) {
    await headers.first().waitFor({ state: 'visible', timeout: 5000 });
  }
}
  // Devuelve los nombres de los encabezados de la tabla
  async obtenerEncabezados(): Promise<string[]> {
    const headers = this.page.getByRole('columnheader');
    const count = await headers.count();
    const nombres: string[] = [];
    for (let i = 0; i < count; i++) {
      nombres.push((await headers.nth(i).innerText()).trim());
    }
    return nombres;
  }

  // Obtiene las filas visibles (texto crudo de las celdas)
  async obtenerFilasVisibles(): Promise<string[][]> {
    const table = this.page.getByRole('table');
    const filas = table.getByRole('row');
    const total = await filas.count();
    const data: string[][] = [];
    for (let i = 0; i < total; i++) {
      const fila = filas.nth(i);
      const esHeader = await fila.getByRole('columnheader').count();
      if (esHeader > 0) continue;
      const celdas = fila.getByRole('cell');
      const c = await celdas.count();
      const valores: string[] = [];
      for (let j = 0; j < c; j++) {
        valores.push((await celdas.nth(j).innerText()).trim());
      }
      if (valores.length) data.push(valores);
    }
    return data;
  }

  async obtenerTodasLasFilas(): Promise<string[][]> {
    return this.obtenerFilasVisibles(); // mejorar si hay paginación
  }

  // Filtros simples (ejemplo: empresa o fechas)
  async filtrarEmpresa(nombre: string) {
    const combo = this.page.getByLabel(/empresa/i);
    await combo.click();
    await this.page.getByRole('option', { name: new RegExp(nombre, 'i') }).click();
  }

  async filtrarFecha(desdeISO: string, hastaISO: string) {
    const desde = this.page.getByLabel(/fecha.*desde|inicio/i);
    const hasta = this.page.getByLabel(/fecha.*hasta|fin/i);
    await desde.fill(desdeISO);
    await hasta.fill(hastaISO);
  }

  async aplicarFiltro() {
    const aplicar = this.page.getByRole('button', { name: /aplicar|filtrar/i });
    if (await aplicar.isVisible().catch(() => false)) {
      await aplicar.click();
    }
    await this.page.waitForTimeout(150);
  }
}