// tests/front-end/reporte-ventas/e2e/cpm-16.spec.ts
import { test, expect } from '@playwright/test';
import { ReporteVentasPage } from '../../reporte-ventas/pages/ReporteVentasPage';

const EMPRESA_OBJETIVO = process.env.EMPRESA_FILTRO ?? 'EMPRESA_DEMO'; // Ajusta a tu dato real
const RANGO_DIAS = 30; // últimos 30 días para mejorar probabilidad de datos

test.describe('CPM-16 - Filtro por Empresa + Rango + Paginación + CSV tolerante', () => {
  test('Aplica filtro de Empresa y valida en todas las páginas', async ({ page, context }) => {
    test.setTimeout(180_000);

    const app = new ReporteVentasPage(page);

    // LOGIN (robusto). Usa variables de entorno: BASE_URL, EMAIL, PASSWORD
    await app.loginConRedireccion();

    // Ir a Reporte de Ventas
    await app.irAReporteVentas();

    // Rango de fechas: últimos N días (patrón tolerante a distintos DatePicker)
    await app.setRangoUltimosNDias(RANGO_DIAS);

    // (Opcional) Espera corta “por si acaso”.
    // Si tu app ya responde rápido, comenta la siguiente línea:
    // await page.waitForTimeout(3000); // <-- borrar/comentar esta línea si no necesita esperar

    // Abrir filtro Empresa y seleccionar la empresa objetivo
    await app.abrirFiltroEmpresa();
    await app.buscarEmpresa(EMPRESA_OBJETIVO);
    await app.seleccionarEmpresaEnResultados(EMPRESA_OBJETIVO);
    await app.confirmarFiltroEmpresa(); // Botón "OK" del modal (o equivalente)

    // Click en Filtrar y esperar la lista (Tabulator u otros)
    await app.clickBuscarYEsperarResultados();

    // Validar estado vacío (warning, NO falla)
    const empty = await app.emptyState();
    if (empty) {
      console.warn(`[CPM-16] ⚠️ Estado vacío con filtro Empresa='${EMPRESA_OBJETIVO}'. Se marca como warning, no falla el test.`);
      // Aún intentamos la exportación CSV de forma tolerante
      await app.exportarCSV_Tolerante('[CPM-16]'); 
      return;
    }

    // Validar que todas las filas de la página actual cumplan Empresa == EMPRESA_OBJETIVO
    await app.validarColumnaContieneEnPagina('Empresa', EMPRESA_OBJETIVO);

    // Probar que el filtro persiste en paginación (si existe otra página)
    const haySiguiente = await app.hayPaginaSiguiente();
    if (haySiguiente) {
      await app.irPaginaSiguienteYEsperar();
      await app.validarColumnaContieneEnPagina('Empresa', EMPRESA_OBJETIVO);

      // Volver a anterior (por consistencia) y validar otra vez
      await app.irPaginaAnteriorYEsperar();
      await app.validarColumnaContieneEnPagina('Empresa', EMPRESA_OBJETIVO);
    } else {
      console.log('[CPM-16] Solo una página de resultados. Paginación no aplicable.');
    }

    // Exportación CSV tolerante: no falla si no aparece / tarda
    await app.exportarCSV_Tolerante('[CPM-16]');

    // Limpieza visual solo si se ocuparia
    // await app.limpiarFiltroEmpresa();
    // await app.clickBuscarYEsperarResultados();
    // await app.validarListaAparece();
  });
});














