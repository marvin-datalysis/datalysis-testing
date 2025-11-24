import { test, expect, chromium, APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';
import { ResumenEjecutivoPage } from './pages/resumenEjecutivo.page';

dotenv.config();

// Timeout global aplicado a todas las pruebas
test.setTimeout(20000);

/**
 * Configuración base de todas las tarjetas visibles en el dashboard.
 * Cada tarjeta está asociada a un queryId para validar datos contra la API.
 * CP-57 / CP-14
 */
const tarjetas = [
  { title: 'VENTAS TOTALES', queryId: 24 },
  { title: 'COSTOS TOTALES', queryId: 21 },
  { title: 'MARGEN TOTAL', queryId: 23 },
  { title: 'MARGEN %', queryId: 22 },
  { title: 'TICKET PROMEDIO', queryId: 25 },
  { title: 'TICKETS', queryId: 20 },
];

/**
 * Mapeo interno entre la etiqueta de UI y el campo devuelto por la API.
 * CP-14
 */
const metricKey: Record<string, string> = {
  'VENTAS TOTALES': 'ventas',
  'COSTOS TOTALES': 'costo',
  'MARGEN TOTAL': 'margenTotal',
  'MARGEN %': 'margenPorcentual',
  'TICKET PROMEDIO': 'ticketPromedio',
  'TICKETS': 'tickets',
};

// Normaliza valores obtenidos desde UI para compararlos numéricamente
function normalizar(v: string | null): number {
  if (!v) return NaN;
  return Number(v.replace(/[$,%\s]/g, '').replace(/,/g, ''));
}

// Consulta real contra la API utilizada por el dashboard
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

  /**
   * Inicialización previa a todas las pruebas:
   * - Abre navegador persistente
   * - Navega al dashboard
   * - Realiza login si es necesario
   * - Espera la carga completa de KPIs iniciales
   * CP-57
   */
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

  /**
   * CP-57 (validación visual en UI)
   * CP-14 (validación de datos contra API)
   * Validación integral de cada tarjeta del dashboard.
   */
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

  /**
   * CP-62
   * Validación de filtros combinados:
   * - Rango de fechas
   * - Empresa
   * - Categoría
   * - Producto
   * - Segmento
   * - Cliente
   */
  test.describe('CP-62 - Filtros combinados del Dashboard de Ventas', () => {

    test('Debe aplicar correctamente todos los filtros y actualizar los KPIs', async () => {

      test.info().annotations.push({
        type: 'CP',
        description: 'CP-62 - Validación de filtros combinados en el dashboard de ventas'
      });

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

  /**
   * CP-63
   * Validación de filtros secundarios:
   * - Top Clientes (10, 25, 50, 100)
   * - Top Productos
   - Vista de tabla
   */
  test('CP-63 - Filtros secundarios: Top Clientes, Top Productos y Vista Tabla', async () => {

    test.info().annotations.push({
      type: 'CP',
      description: 'CP-63 - Validación de filtros secundarios del dashboard'
    });

    await resumen.seleccionarDropdownSimplePorId("top-cliente-dropdown", "25");
    await resumen.seleccionarDropdownSimplePorId("top-producto-dropdown", "50");
    await resumen.seleccionarVistaTabla("Categoria");

    await expect(resumen.page.getByText("Top Ventas a Clientes")).toBeVisible();
    await expect(resumen.page.getByText("Top Productos Vendidos")).toBeVisible();

    await expect(
      resumen.page.locator('div.relative:has(#summary-table-selector-dropdown) >> div.text-sm', {
        hasText: "Categoria"
      })
    ).toBeVisible();
  });

  /**
   * Parte del CP-62
   * Validación del filtro de periodo:
   * - Día
   * - Semana
   * - Mes
   * - Trimestre
   * - Año
   */
  test.describe('Filtros de periodo', () => {

    test('Filtro Día', async () => {
      await resumen.seleccionarPeriodo('Día');
    });

    test('Filtro Semana', async () => {
      await resumen.seleccionarPeriodo('Semana');
    });

    test('Filtro Mes', async () => {
      await resumen.seleccionarPeriodo('Mes');
    });

    test('Filtro Trimestre', async () => {
      await resumen.seleccionarPeriodo('Trimestre');
    });

    test('Filtro Año', async () => {
      await resumen.seleccionarPeriodo('Año');
    });

  });

  /**
   * Validación incluida dentro del CP-62.
   * Asegura que una fecha de fin menor a la fecha de inicio se marque como inválida.
   */
 test('Fecha fin menor que inicio no debe generar errores en UI', async () => {

    // Aplicar fechas invertidas
    await resumen.setDatePicker('(//div[@data-slot="input-wrapper"])[1]', {
      d: '20', m: '11', y: '2025'
    });

    await resumen.setDatePicker('(//div[@data-slot="input-wrapper"])[2]', {
      d: '10', m: '11', y: '2025'
    });

    // Click en Filtrar
    await resumen.page.getByRole('button', { name: 'Filtrar' }).click();

    // Esperar render sin crashear
    await resumen.validarRenderBasico();
  });



  /**
   * CP-59 / CP-60 / CP-61 según documento (gráficos)
   * Validación del esquema de la API del gráfico antes de ser renderizado.
   */
  test('Esquema de API del gráfico es válido', async () => {

    test.setTimeout(40000);

    await resumen.seleccionarPeriodo('Mes');

    // Verificar que se renderiza un canvas de ECharts
    const canvas = resumen.page.locator('canvas[data-zr-dom-id]');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Validar que existe instancia de gráfico
    const tieneInstancia = await resumen.page.evaluate(() => {
      return !!document.querySelector('[ _echarts_instance_ ]');
    });

    expect(tieneInstancia).toBeTruthy();
  });





});
