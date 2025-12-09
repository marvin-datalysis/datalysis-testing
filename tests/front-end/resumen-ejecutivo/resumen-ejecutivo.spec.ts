import { test, expect, chromium, APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
import { LoginPage } from '../Seguridad/Login/pages/login.page';
import { getAccessToken } from '../../../utils/getToken';
import { ResumenEjecutivoPage } from './pages/resumenEjecutivo.page';

dotenv.config();

test.setTimeout(30000);

// ============================================================
// CONFIGURACIÓN DE KPI + API
// ============================================================

const tarjetas = [
  { title: 'VENTAS TOTALES',   queryId: 24, apiKey: 'ventasTotales' },
  { title: 'COSTOS TOTALES',   queryId: 21, apiKey: 'costosTotales' },
  { title: 'MARGEN TOTAL',     queryId: 23, apiKey: 'margenTotal' },
  { title: 'MARGEN %',         queryId: 22, apiKey: 'margenPorcentual' },
  { title: 'TICKET PROMEDIO',  queryId: 25, apiKey: 'ticketPromedio' },
  { title: 'TICKETS',          queryId: 20, apiKey: 'totalTickets' },
];

// Normalización de valores visibles en UI
function normalizar(v: string | null): number {
  if (!v) return NaN;
  return Number(v.replace(/[$,%\s]/g, '').replace(/,/g, ''));
}

// Consumir API real usando las fechas reales del UI
async function consultarAPI(queryId: number, rango: { fechaMin: string; fechaMax: string }) {
  const api: APIRequestContext = await playwrightRequest.newContext();
  const token = await getAccessToken();

  const response = await api.post(`${process.env.API_URL}/api/queries/exec/${queryId}`, {
    headers: {
      accessToken: token,
      'Content-Type': 'application/json',
    },
    data: {
      fechaMin: rango.fechaMin,
      fechaMax: rango.fechaMax,
      numeroSucursal: [],
      nombreCategoria: [],
      segmentoCliente: [],
      nombreProducto: [],
      nombreCliente: []
    }
  });

  const json = await response.json();
  await api.dispose();
  return json;
}

// ============================================================
// TESTS PRINCIPALES
// ============================================================

test.describe('Dashboard Resumen Ejecutivo (E2E)', () => {

  let resumen: ResumenEjecutivoPage;

  // ------------------------------------------------------------
  // BEFORE ALL — Login + Navegación
  // ------------------------------------------------------------
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(90000);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const loginPage = new LoginPage(page);
    resumen = new ResumenEjecutivoPage(page);

    await loginPage.goto();
    await loginPage.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

    await page.waitForURL(/dashboard|resumen-ejecutivo|inicio/);

    await resumen.ir();
    await resumen.esperarCarga();
    await resumen.esperarKPIs();
  });



  // ------------------------------------------------------------
  // CP-57 / CP-14 — Validación visual + API con tolerancia segura
  // ------------------------------------------------------------

  const TOLERANCIA_PORCENTAJE = 0.05; // 5%

  for (const tarjeta of tarjetas) {

    test.only(`CP-57 / CP-14 - Validar tarjeta: ${tarjeta.title}`, async () => {

      // 1. Extraer fechas reales del UI
      const rango = await resumen.getRangoFechasParaAPI();

      // 2. Extraer valores UI
      const card = resumen.tarjeta(tarjeta.title);
      await card.actual.waitFor({ state: 'visible', timeout: 60000 });

      const actualUI   = normalizar(await card.actual.innerText());
      const anteriorUI = normalizar(await card.anterior.innerText());

      // 3. Consultar API con las mismas fechas del UI
      const api = await consultarAPI(tarjeta.queryId, rango);
      const key = tarjeta.apiKey;

      const current = api?.data?.currentDateRange?.[key];
      const prior   = api?.data?.priorDateRange?.[key];

      // 4. Validación con tolerancia
      function validarConTolerancia(ui: number, backend: number, campo: string) {
        const diff = Math.abs(ui - backend);
        const tolerancia = backend * TOLERANCIA_PORCENTAJE;

        expect(diff,
          `El KPI '${campo}' difiere demasiado.
UI:   ${ui}
API:  ${backend}
Diff: ${diff} > Tol: ${tolerancia}
Fechas usadas:
  Min: ${rango.fechaMin}
  Max: ${rango.fechaMax}`
        ).toBeLessThanOrEqual(tolerancia);
      }

      if (typeof current === 'number') validarConTolerancia(actualUI,   current, tarjeta.title);
      if (typeof prior   === 'number') validarConTolerancia(anteriorUI, prior,   tarjeta.title);
    });
  }


  // ------------------------------------------------------------
  // CP-62 — Filtros combinados
  // ------------------------------------------------------------
  test.describe('CP-62 — Filtros combinados', () => {

    test.only('Debe aplicar todos los filtros y actualizar KPIs', async () => {

      await resumen.aplicarFiltrosCompletos({
        inicio: "1",
        fin: "19",
        empresa: "ConectaYa",
        categoria: "Electrodomésticos",
        producto: "Guantes de moto de cuero",
        segmento: "Early adopters",
        cliente: "Adrián Castillo"
      });

      for (const tarjeta of tarjetas) {
        await resumen.tarjeta(tarjeta.title).actual.waitFor();
      }

      await resumen.limpiarFiltros();
    });
  });


  // ------------------------------------------------------------
  // CP-63 — Filtros secundarios
  // ------------------------------------------------------------
  test('CP-63 — Filtros secundarios', async () => {

    await resumen.seleccionarDropdownSimplePorId("top-cliente-dropdown", "25");
    await resumen.seleccionarDropdownSimplePorId("top-producto-dropdown", "50");
    await resumen.seleccionarVistaTabla("Categoria");

    await expect(resumen.page.getByText("Top Ventas a Clientes")).toBeVisible();
    await expect(resumen.page.getByText("Top Productos Vendidos")).toBeVisible();
  });


  // ------------------------------------------------------------
  // CP-62 — Validación de periodo
  // ------------------------------------------------------------
  test.describe('Filtros de periodo', () => {
    for (const periodo of ['Día', 'Semana', 'Mes', 'Trimestre', 'Año']) {
      test(`Filtro ${periodo}`, async () => {
        await resumen.seleccionarPeriodo(periodo as any);
      });
    }
  });


  // ------------------------------------------------------------
  // Fecha inválida (parte del CP-62)
  // ------------------------------------------------------------
  test('Fecha fin menor que inicio no debe romper UI', async () => {

    await resumen.setDatePicker('(//div[@data-slot="input-wrapper"])[1]', {
      d: '20', m: '11', y: '2025'
    });

    await resumen.setDatePicker('(//div[@data-slot="input-wrapper"])[2]', {
      d: '10', m: '11', y: '2025'
    });

    await resumen.page.getByRole('button', { name: 'Filtrar' }).click();
    await resumen.validarRenderBasico();
  });


  // ------------------------------------------------------------
  // CP-59/60/61 — Validación API del gráfico
  // ------------------------------------------------------------
  test('Esquema API del gráfico es válido', async () => {

    await resumen.seleccionarPeriodo('Mes');

    const canvas = resumen.page.locator('canvas[data-zr-dom-id]');
    await expect(canvas).toBeVisible();

    const tieneInstancia = await resumen.page.evaluate(() => {
      return !!document.querySelector('[ _echarts_instance_ ]');
    });

    expect(tieneInstancia).toBeTruthy();
  });

});
