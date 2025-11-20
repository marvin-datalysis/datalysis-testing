import { test, expect, chromium, APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';
import { ResumenEjecutivoPage } from './pages/resumenEjecutivo.page';

dotenv.config();

// Timeout global
test.setTimeout(20000);

// ===============================
// CONFIGURACIÓN DE TARJETAS (HTML REAL)
// ===============================
const tarjetas = [
  { title: 'VENTAS TOTALES', queryId: 24 },
  { title: 'COSTOS TOTALES', queryId: 21 },
  { title: 'MARGEN TOTAL', queryId: 23 },
  { title: 'MARGEN %', queryId: 22 },
  { title: 'TICKET PROMEDIO', queryId: 25 },
  { title: 'TICKETS', queryId: 20 },
];

// ===============================
// MAPEOS API
// ===============================
const metricKey: Record<string, string> = {
  'VENTAS TOTALES': 'ventas',
  'COSTOS TOTALES': 'costo',
  'MARGEN TOTAL': 'margenTotal',
  'MARGEN %': 'margenPorcentual',
  'TICKET PROMEDIO': 'ticketPromedio',
  'TICKETS': 'tickets',
};

// Normalización
function normalizar(v: string | null): number {
  if (!v) return NaN;
  return Number(v.replace(/[$,%\s]/g, '').replace(/,/g, ''));
}

// API
async function consultarAPI(queryId: number) {
  const api: APIRequestContext = await playwrightRequest.newContext();
  const token = await getAccessToken();

  const response = await api.post(`${process.env.API_URL}/api/queries/exec/${queryId}`, {
    headers: {
      accessToken: token,
      'Content-Type': 'application/json',
    },
    data: {
      datePeriod: 'month',
      timeComparison: 'prior_period',
    },
  });

  const data = await response.json();
  await api.dispose();
  return data;
}

test.describe('Dashboard Resumen Ejecutivo (POM)', () => {
  test.describe.configure({ timeout: 20000 });

  let resumen: ResumenEjecutivoPage;

  // ===============================
  // BEFORE ALL
  // ===============================
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(20000);

    const context = await chromium.launchPersistentContext('./context/chromium', {
      headless: false,
    });

    const page = await context.newPage();
    resumen = new ResumenEjecutivoPage(page);

    await resumen.ir();

    if (page.url().includes('sign-in')) {
      await login(page);
    }

    await resumen.esperarCarga();
    await resumen.esperarKPIs();
  });

  // ===============================
  // VALIDACIÓN DE TARJETAS
  // Aplica CP-57 (frontend) y CP-14 (API)
  // ===============================
  for (const tarjeta of tarjetas) {
    test(`CP-57 / CP-14 - Validar tarjeta: ${tarjeta.title}`, async () => {
      const card = resumen.tarjeta(tarjeta.title);

      await card.actual.waitFor({ state: 'visible', timeout: 60000 });

      const actualUI = normalizar(await card.actual.innerText());
      const anteriorUI = normalizar(await card.anterior.innerText());
      const anioUI = normalizar(await card.anio.innerText());

      const api = await consultarAPI(tarjeta.queryId);
      const key = metricKey[tarjeta.title];

      const actualAPI = api.data?.summary?.secondPeriod?.[key];
      const anteriorAPI = api.data?.summary?.firstPeriod?.[key];

      if (typeof actualAPI === 'number') {
        await expect(actualUI).toBeCloseTo(actualAPI, 1);
      }

      if (typeof anteriorAPI === 'number') {
        await expect(anteriorUI).toBeCloseTo(anteriorAPI, 1);
      }

      expect(!isNaN(anioUI)).toBeTruthy();
    });
  }

  // ===============================
  // FILTROS
  // CP-62
  // ===============================
   test.describe('CP-62 - Filtros combinados del Dashboard de Ventas', () => {

  test('Debe aplicar correctamente todos los filtros y actualizar los KPIs', async () => {

    // ---------- GIVEN ----------
    test.info().annotations.push({
      type: 'CP',
      description: 'CP-62 - Validación de filtros combinados en el dashboard de ventas'
    });

    // El usuario se encuentra en el Dashboard Resumen Ejecutivo
    // (Esto ya lo maneja tu beforeAll en este spec)


    // ---------- WHEN ----------
    // Cuando aplica un rango de fechas, y selecciona filtros de empresa,
    // categoría, producto, segmento y cliente
    await resumen.aplicarFiltrosCompletos({
      inicio: "1",
      fin: "19",
      empresa: "ConectaYa",
      categoria: "Electrodomésticos",
      producto: "Guantes de moto de cuero",
      segmento: "Early adopters",
      cliente: "Adrián Castillo"
    });


    // ---------- THEN ----------
    // Entonces los KPIs del dashboard deben actualizarse exitosamente
    for (const tarjeta of tarjetas) {
      await resumen.tarjeta(tarjeta.title).actual.waitFor();
    }

    // Y el usuario puede limpiar los filtros sin errores
    await resumen.limpiarFiltros();
  });

});

// ======================================
// CP-63 — Validar filtros secundarios del Dashboard
// ======================================
test('CP-62 - Filtros secundarios: Top Clientes, Top Productos y Vista Tabla', async () => {

  test.info().annotations.push({
    type: 'CP',
    description: 'CP-63 - Validación de filtros secundarios del dashboard (top clientes, productos y vista tabla)'
  });

  // WHEN
  await resumen.seleccionarDropdownSimplePorId("top-cliente-dropdown", "25");
  await resumen.seleccionarDropdownSimplePorId("top-producto-dropdown", "50");
  await resumen.seleccionarVistaTabla("Categoria");

  // THEN
  await expect(resumen.page.getByText("Top Ventas a Clientes")).toBeVisible();
  await expect(resumen.page.getByText("Top Productos Vendidos")).toBeVisible();

  // Validar vista actual: Categoria
  await expect(
    resumen.page.locator('div.relative:has(#summary-table-selector-dropdown) >> div.text-sm', {
      hasText: "Categoria"
    })
  ).toBeVisible();
});





});
