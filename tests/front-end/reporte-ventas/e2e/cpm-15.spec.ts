// tests/front-end/reporte-ventas/e2e/cpm-15.spec.ts

import { test, expect } from '@playwright/test';
import ReporteVentasPage from '../pages/ReporteVentasPage';

// Helpers de fecha (ISO YYYY-MM-DD)
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hoy = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const rango = (dias: number) => {
  const h = hoy(); const d = new Date(h); d.setDate(d.getDate() - (dias - 1));
  return { desde: iso(d), hasta: iso(h) };
};

test.describe('CPM-15 — Filtro de fecha actualiza el reporte', () => {
  let po: ReporteVentasPage;

  test.beforeEach(async ({ page }) => {
    po = new ReporteVentasPage(page);              // Se reusa el pom existente "ReporteVentasPage.ts"
    await po.ir(process.env.BASE_URL ?? '');       // Se navega a /reportes/ventas
  });

  test('cambia al aplicar rangos A → B → C', async ({ page }) => {
    // Rango A: últimos 7 días
    const A = rango(7);
    await po.setRangoFechas(A.desde, A.hasta);     // Se setea rango A
    await po.clickBuscar();                        // Se aplica filtro

    await page.waitForTimeout(3000);               // <-- Espera manual 3s (comentable si no se necesita)
    await po.esperarLista();                       // <-- Espera a la grilla (comentable si ya es suficiente la anterior)
    await expect(page.locator('div.tabulator')).toBeVisible();

    const filasA = await po.getFilasTabla();
    const sumaA  = await po.getSumatoriaPaginaActual();
    expect(Number.isFinite(sumaA)).toBeTruthy();

    // Rango B: hoy
    const B = rango(1);
    await po.setRangoFechas(B.desde, B.hasta);     // Se setea rango B
    await po.clickBuscar();

    await page.waitForTimeout(3000);               // <-- Espera manual 3s (comentable)
    await po.esperarLista();                       // <-- Espera a la grilla (comentable)
    await expect(page.locator('div.tabulator')).toBeVisible();

    const filasB = await po.getFilasTabla();
    const sumaB  = await po.getSumatoriaPaginaActual();
    expect(Number.isFinite(sumaB)).toBeTruthy();

    // Debe cambiar entre A y B (filas o sumatoria)
    const cambioAB = filasA !== filasB || Math.abs((sumaA ?? 0) - (sumaB ?? 0)) > 0.01;
    expect(cambioAB).toBeTruthy();

    // Rango C: últimos 3 días
    const C = rango(3);
    await po.setRangoFechas(C.desde, C.hasta);     // Se setea rango C
    await po.clickBuscar();

    await page.waitForTimeout(3000);               // <-- Espera manual 3s (comentable)
    await po.esperarLista();                       // <-- Espera a la grilla (comentable)
    await expect(page.locator('div.tabulator')).toBeVisible();

    const filasC = await po.getFilasTabla();
    const sumaC  = await po.getSumatoriaPaginaActual();
    expect(Number.isFinite(sumaC)).toBeTruthy();

    // Debe cambiar entre B y C
    const cambioBC = filasB !== filasC || Math.abs((sumaB ?? 0) - (sumaC ?? 0)) > 0.01;
    expect(cambioBC).toBeTruthy();

    // Nota tolerante si la data es igual en rangos
    if (!cambioAB || !cambioBC) {
      test.info().annotations.push({
        type: 'warning',
        description: 'El contenido no varió entre algunos rangos; posible misma data para esos períodos.'
      });
    }
  });
});















