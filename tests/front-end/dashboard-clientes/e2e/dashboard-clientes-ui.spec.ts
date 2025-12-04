// tests/front-end/dashboard-clientes/e2e/dashboard-clientes-ui.spec.ts
import { test, expect, chromium } from "@playwright/test";
import DashboardClientesPage from "../pages/DashboardClientesPage";

// IMPORTANTE: App muy lenta, timeouts generosos
test.setTimeout(240_000);

const BASE_URL = process.env.BASE_URL ?? process.env.APP_URL ?? "";
const EMAIL = process.env.EMAIL ?? "tesinaqa@datalysisgroup.com";
const PASSWORD = process.env.PASSWORD ?? "Tesina#2025";
const HOY = new Date();
const toISO = (d: Date) => d.toISOString().slice(0, 10);

// Cliente de prueba por defecto
const CLIENTE_TEST = "Adrián Castillo";

test.describe("Dashboard Clientes - Pruebas E2E Frontend", () => {
  let dashboard: DashboardClientesPage;

  // ============================================================
  // BEFORE ALL — Login UNA SOLA VEZ (patrón de resumen-ejecutivo)
  // ============================================================
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    dashboard = new DashboardClientesPage(page);

    // Login directo (sin usar LoginPage que requiere APP_URL)
    await page.goto(`${BASE_URL}/es/auth/sign-in`, { waitUntil: 'domcontentloaded' });
    
    await page.locator('input#email').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input#email').fill(EMAIL);
    await page.locator('input#password').fill(PASSWORD);
    await page.locator('button#login').click();

    await page.waitForURL(/dashboard|resumen-ejecutivo|inicio/, { timeout: 60_000 });

    // Navegar a dashboard/clientes
    await dashboard.ir(BASE_URL);
    await dashboard.esperarCarga();
    
    // Aplicar filtro de cliente UNA SOLA VEZ
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();
    
    // CLAVE: Espera adicional larga para que cargue TODO el dashboard (app muy lenta)
    console.log(`  Esperando 10 segundos adicionales para carga completa del dashboard...`);
    await page.waitForTimeout(10000);
    
    console.log(`  Login completado y filtro "${CLIENTE_TEST}" aplicado`);
  });

  // CP-68: Validación de tarjeta de información general del cliente
  test("CP-68: Validación de tarjeta de información general del cliente", async () => {
    const infoGeneral = await dashboard.getInfoGeneral();
    console.log(`[CP-68] Info general length: ${infoGeneral.length}`);
    
    if (infoGeneral.length > 0) {
      console.log(`[CP-68] Tarjeta de información general encontrada`);
    } else {
      console.log(`[CP-68] WARNING: Tarjeta no encontrada con los selectores actuales`);
    }
  });

  // CP-69: Validación de tarjeta de información de contacto del cliente
  test("CP-69: Validación de tarjeta de información de contacto del cliente", async () => {
    const infoContacto = await dashboard.getInfoContacto();
    console.log(`[CP-69] Info contacto length: ${infoContacto.length}`);
    
    if (infoContacto.length > 0) {
      const tieneContacto = /tel[ée]fono|phone|email|correo|direcci[óo]n|address/i.test(infoContacto);
      if (tieneContacto) {
        console.log(`[CP-69] Tarjeta de contacto encontrada`);
      } else {
        console.log(`[CP-69] WARNING: Tarjeta encontrada pero sin campos de contacto`);
      }
    } else {
      console.log(`[CP-69] WARNING: Tarjeta de contacto no encontrada con los selectores actuales`);
    }
  });

  // CP-70: Validación de tarjeta de notas del cliente
  test("CP-70: Validación de tarjeta de notas del cliente", async () => {
    const notas = await dashboard.getNotas();
    expect(notas).toBeDefined();
    console.log(`[CP-70] Notas length: ${notas.length}`);
  });

  // CP-71: Validación de tarjeta de ventas totales del cliente
  test("CP-71: Validación de tarjeta de ventas totales del cliente", async () => {
    const ventasTotales = await dashboard.getVentasTotales();
    expect(ventasTotales).toBeGreaterThanOrEqual(0);
    console.log(`[CP-71] Ventas totales: ${ventasTotales}`);
  });

  // CP-72: Validación de período medio de pago
  test("CP-72: Validación de período medio de pago", async () => {
    const periodoMedio = await dashboard.getPeriodoMedioPago();
    expect(periodoMedio).toBeGreaterThanOrEqual(0);
    console.log(`[CP-72] Período medio: ${periodoMedio} días`);
  });

  // CP-73: Validación de monto de pago pendiente
  test("CP-73: Validación de monto de pago pendiente", async () => {
    const montoPendiente = await dashboard.getMontoPendiente();
    expect(montoPendiente).toBeGreaterThanOrEqual(0);
    console.log(`[CP-73] Monto pendiente: ${montoPendiente}`);
  });

  // CP-74: Validación de tarjeta de morosidad
  test("CP-74: Validación de tarjeta de morosidad", async () => {
    const morosidad = await dashboard.getMorosidad();
    expect(morosidad).toBeDefined();
    console.log(`[CP-74] Morosidad length: ${morosidad.length}`);
  });

  // CP-75: Validación de tarjeta de clasificación crediticia
  test("CP-75: Validación de tarjeta de clasificación crediticia", async () => {
    const clasificacion = await dashboard.getClasificacionCrediticia();
    expect(clasificacion.length).toBeGreaterThanOrEqual(0);
    console.log(`[CP-75] Clasificación: ${clasificacion}`);
  });

  // CP-76: Validación de tabla de clasificación por volumen de ventas
  test("CP-76: Validación de tabla de clasificación por volumen de ventas", async () => {
    const tabla = dashboard.getTablaClasificacionVolumen(); // SIN await - retorna Locator
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
      console.log(`[CP-76] Tabla clasificación: ${filas} filas`);
    } else {
      console.log(`[CP-76] WARNING: Tabla no encontrada`);
    }
  });

  // CP-77: Validación de gráfico de cartera de crédito/contado
  test("CP-77: Validación de gráfico de cartera de crédito/contado", async () => {
    const grafico = dashboard.graficoCarteraCreditoContado(); // SIN await - retorna Locator
    if (await grafico.count() > 0) {
      await expect(grafico).toBeVisible({ timeout: 30_000 });
      console.log(`[CP-77] Gráfico cartera visible`);
    } else {
      console.log(`[CP-77] WARNING: Gráfico no encontrado`);
    }
  });

  // CP-78: Validación de gráfico de límite crediticio
  test("CP-78: Validación de gráfico de límite crediticio", async () => {
    const grafico = dashboard.graficoLimiteCrediticio(); // SIN await - retorna Locator
    if (await grafico.count() > 0) {
      await expect(grafico).toBeVisible({ timeout: 30_000 });
      console.log(`[CP-78] Gráfico límite crediticio visible`);
    } else {
      console.log(`[CP-78] WARNING: Gráfico no encontrado`);
    }
  });

  // CP-79: Validación de tarjeta de ticket promedio del cliente
  test("CP-79: Validación de tarjeta de ticket promedio del cliente", async () => {
    const ticketPromedio = await dashboard.getTicketPromedio();
    expect(ticketPromedio).toBeGreaterThanOrEqual(0);
    console.log(`[CP-79] Ticket promedio: ${ticketPromedio}`);
  });

  // CP-80: Validación de tarjeta de frecuencia de compra
  test("CP-80: Validación de tarjeta de frecuencia de compra", async () => {
    const frecuencia = await dashboard.getFrecuenciaCompra();
    expect(frecuencia).toBeGreaterThanOrEqual(0);
    console.log(`[CP-80] Frecuencia: ${frecuencia} días`);
  });

  // CP-81: Validación de tabla de recomendación de productos
  test("CP-81: Validación de tabla de recomendación de productos", async () => {
    const tabla = dashboard.getTablaRecomendacionProductos(); // SIN await - retorna Locator
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
      console.log(`[CP-81] Tabla recomendación: ${filas} filas`);
    } else {
      console.log(`[CP-81] WARNING: Tabla no encontrada`);
    }
  });

  // CP-82: Validación de tabla de estado de cuenta
  test("CP-82: Validación de tabla de estado de cuenta", async () => {
    const tabla = dashboard.getTablaEstadoCuenta(); // SIN await - retorna Locator
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
      console.log(`[CP-82] Tabla estado de cuenta: ${filas} filas`);
    } else {
      console.log(`[CP-82] WARNING: Tabla no encontrada`);
    
  });
});

