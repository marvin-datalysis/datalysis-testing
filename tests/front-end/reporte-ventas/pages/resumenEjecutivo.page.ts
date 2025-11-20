import { Page } from '@playwright/test';

export class ResumenEjecutivoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async ir() {
    await this.page.goto(`${process.env.APP_URL}/dashboard/resumen-ejecutivo`, {
      waitUntil: 'domcontentloaded',
    });
  }

  async esperarCarga() {
    const loader = this.page.locator('.animacion-carga');

    if (await loader.isVisible({ timeout: 2000 })) {
      await loader.waitFor({
        state: 'detached',
        timeout: 120000,
      });
    }
  }

  async esperarKPIs() {
    await this.esperarCarga();

    const titulos = [
      'VENTAS TOTALES',
      'COSTOS TOTALES',
      'MARGEN TOTAL',
      'MARGEN %',
      'TICKET PROMEDIO',
      'TICKETS'
    ];

    for (const titulo of titulos) {
      await this.page.getByText(titulo, { exact: true }).waitFor({
        state: 'visible',
        timeout: 60000
      });
    }

    await this.page.locator('span.text-4xl').first().waitFor({
      state: 'visible',
      timeout: 60000
    });

    await this.page.waitForTimeout(300);
  }

  tarjeta(titulo: string) {
    const card = this.page
      .getByText(titulo, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"shadow-md")]');

    return {
      actual: card.locator('.flex-row span.text-4xl').last(),
      anterior: card.locator('.grid .text-2xl').first(),
      anio: card.locator('.grid .text-2xl').nth(1),
    };
  }

 // ============================================================
  // === CP-62 === Filtros combinados
  // ============================================================

  // -------------------------
  // DatePicker: rellenar día/mes/año (HTML real)
  // -------------------------
  async setDatePicker(baseSelector: string, fecha: { d: string, m: string, y: string }) {

    const campos = this.page.locator(
      `${baseSelector}//div[@role="spinbutton"]`
    );

    // Día
    await campos.nth(0).fill(fecha.d);

    // Mes
    await campos.nth(1).fill(fecha.m);

    // Año
    await campos.nth(2).fill(fecha.y);
  }

  // -------------------------
  // DatePicker rango completo
  // -------------------------
  async seleccionarRangoFechas(desde: string, hasta: string) {

    // Fecha Inicio (primer datepicker)
    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[1]', {
      d: desde.padStart(2, "0"),
      m: "11",
      y: "2025"
    });

    // Fecha Fin (segundo datepicker)
    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[2]', {
      d: hasta.padStart(2, "0"),
      m: "11",
      y: "2025"
    });
  }

  // -------------------------
  // Filtro con checkbox + botón Ok
  // -------------------------
  async seleccionarFiltroLista(label: string, valor: string) {

    // 1. Abrir el dropdown correcto
    const dropdownTrigger = this.page
      .locator(`div.flex:has(div.text-sm:has-text("${label}"))`);
    await dropdownTrigger.click();

    // 2. Localizar el dropdown abierto (solo 1 estará visible)
    const dropdown = this.page.locator('div[id^="dropdown-"]:visible');

    // 3. Buscar dentro del dropdown, NO en toda la página
    const buscador = dropdown.getByPlaceholder('Buscar');
    if (await buscador.isVisible()) {
      await buscador.fill(valor);
    }

    // 4. Seleccionar item dentro del dropdown
    await dropdown.getByText(valor, { exact: true }).click();

    // 5. Confirmar
    await dropdown.getByRole('button', { name: /^Ok$/ }).click();
  }




  // -------------------------
  // Filtros combinados
  // -------------------------
  async aplicarFiltrosCompletos(filtros: {
    inicio?: string;
    fin?: string;
    empresa?: string;
    categoria?: string;
    producto?: string;
    segmento?: string;
    cliente?: string;
  }) {

    const valorAntes = await this.page.locator('span.text-4xl').first().innerText();

    // Fechas
    if (filtros.inicio && filtros.fin) {
      await this.seleccionarRangoFechas(filtros.inicio, filtros.fin);
    }

    // Empresa
    if (filtros.empresa) {
      await this.seleccionarFiltroLista("Empresa", filtros.empresa);
    }

    // Categoría
    if (filtros.categoria) {
      await this.seleccionarFiltroLista("Categoria", filtros.categoria);
    }

    // Producto
    if (filtros.producto) {
      await this.seleccionarFiltroLista("Producto", filtros.producto);
    }

    // Segmento
    if (filtros.segmento) {
      await this.seleccionarFiltroLista("Segmento", filtros.segmento);
    }

    // Cliente
    if (filtros.cliente) {
      await this.seleccionarFiltroLista("Cliente", filtros.cliente);
    }

    // Click en Filtrar
    await this.page.getByRole('button', { name: 'Filtrar' }).click();

    // Esperar cambio real en KPIs
    await this.page.waitForFunction(
      (oldValue) => {
        const spans = Array.from(document.querySelectorAll('span.text-4xl'));
        return spans.some(s => s.textContent.trim() !== oldValue.trim());
      },
      valorAntes,
      { timeout: 60000 }
    );
  }

  // -------------------------
  // Limpiar filtros
  // -------------------------
  async limpiarFiltros() {
    await this.page.getByRole('button', { name: 'Limpiar' }).click();
  }

// -------------------------
// Dropdown simple por ID (10 / 25 / 50 / 100)
// Compatible con: top-cliente-dropdown, top-producto-dropdown
// -------------------------
async seleccionarDropdownSimplePorId(dropdownId: string, nuevoValor: string) {

  // 1. Abrir el dropdown clickeando el botón padre del ID
  const button = this.page.locator(`div.relative:has(#${dropdownId}) >> button`);
  await button.click();

  // 2. Seleccionar la opción dentro del dropdown visible
  const dropdown = this.page.locator(`#${dropdownId}`);
  await dropdown.getByText(nuevoValor, { exact: true }).click();
}


// -------------------------
// Selector de vista de tabla
// ID fijo: summary-table-selector-dropdown
// -------------------------
async seleccionarVistaTabla(nuevaVista: string) {

  // Abrir el dropdown
  const button = this.page.locator(`div.relative:has(#summary-table-selector-dropdown) >> button`);
  await button.click();

  // Seleccionar la opción exacta dentro del dropdown
  const dropdown = this.page.locator('#summary-table-selector-dropdown');
  await dropdown.getByText(nuevaVista, { exact: true }).click();
}



}
