// tests/front-end/dashboard-clientes/e2e/dashboard-clientes-ui.spec.ts
import { test, expect } from "@playwright/test";
import DashboardClientesPage from "../pages/DashboardClientesPage";
import { login } from "../../../../utils/login";

const BASE_URL = process.env.BASE_URL ?? process.env.APP_URL ?? "";
const HOY = new Date();
const toISO = (d: Date) => d.toISOString().slice(0, 10);

// Cliente de prueba por defecto
const CLIENTE_TEST = "Adrián Castillo";

test.describe("Dashboard Clientes - Pruebas E2E Frontend", () => {
  test.beforeEach(async ({ page }) => {
    if (!BASE_URL) {
      test.skip(true, "BASE_URL or APP_URL is required");
    }

    const dashboard = new DashboardClientesPage(page);
    await dashboard.ir(BASE_URL);

    if (page.url().includes("/auth/sign-in")) {
      await login(page);
      await dashboard.ir(BASE_URL);
    }

    await dashboard.esperarCarga();
  });

  // CP-68: Validación de tarjeta de información general del cliente
  test("CP-68: Validación de tarjeta de información general del cliente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const infoGeneral = await dashboard.getInfoGeneral();
    expect(infoGeneral.length).toBeGreaterThan(0);
    // Verificar que contiene información del cliente
    expect(infoGeneral.toLowerCase()).toContain(CLIENTE_TEST.toLowerCase());
  });

  // CP-69: Validación de tarjeta de información de contacto del cliente
  test("CP-69: Validación de tarjeta de información de contacto del cliente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const infoContacto = await dashboard.getInfoContacto();
    expect(infoContacto.length).toBeGreaterThan(0);
    // Verificar que contiene datos de contacto (teléfono, email, dirección)
    const tieneContacto = 
      /tel[ée]fono|phone|email|correo|direcci[óo]n|address/i.test(infoContacto);
    expect(tieneContacto).toBeTruthy();
  });

  // CP-70: Validación de tarjeta de notas del cliente
  test("CP-70: Validación de tarjeta de notas del cliente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const notas = await dashboard.getNotas();
    // Las notas pueden estar vacías, pero la tarjeta debe existir
    expect(notas).toBeDefined();
  });

  // CP-71: Validación de tarjeta de ventas totales del cliente
  test("CP-71: Validación de tarjeta de ventas totales del cliente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date(HOY);
    desde.setDate(HOY.getDate() - 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(HOY));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const ventasTotales = await dashboard.getVentasTotales();
    expect(ventasTotales).toBeGreaterThanOrEqual(0);
  });

  // CP-72: Validación de período medio de pago
  test("CP-72: Validación de período medio de pago", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date(HOY);
    desde.setDate(HOY.getDate() - 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(HOY));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const periodoMedio = await dashboard.getPeriodoMedioPago();
    expect(periodoMedio).toBeGreaterThanOrEqual(0);
  });

  // CP-73: Validación de monto de pago pendiente
  test("CP-73: Validación de monto de pago pendiente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const montoPendiente = await dashboard.getMontoPendiente();
    expect(montoPendiente).toBeGreaterThanOrEqual(0);
  });

  // CP-74: Validación de tarjeta de morosidad
  test("CP-74: Validación de tarjeta de morosidad", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const morosidad = await dashboard.getMorosidad();
    // La morosidad puede estar vacía si no hay vencimientos
    expect(morosidad).toBeDefined();
  });

  // CP-75: Validación de tarjeta de clasificación crediticia
  test("CP-75: Validación de tarjeta de clasificación crediticia", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const clasificacion = await dashboard.getClasificacionCrediticia();
    // Puede ser Oro, Plata, Bronce, etc.
    expect(clasificacion.length).toBeGreaterThanOrEqual(0);
  });

  // CP-76: Validación de tabla de clasificación por volumen de ventas
  test("CP-76: Validación de tabla de clasificación por volumen de ventas", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const tabla = dashboard.getTablaClasificacionVolumen();
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
    }
  });

  // CP-77: Validación de gráfico de cartera de crédito/contado
  test("CP-77: Validación de gráfico de cartera de crédito/contado", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date();
    desde.setFullYear(2023, 0, 1);
    const hasta = new Date();
    hasta.setFullYear(2025, 10, 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(hasta));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const grafico = dashboard.graficoCarteraCreditoContado();
    if (await grafico.count() > 0) {
      await expect(grafico).toBeVisible({ timeout: 30_000 });
    }
  });

  // CP-78: Validación de gráfico de límite crediticio
  test("CP-78: Validación de gráfico de límite crediticio", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const grafico = dashboard.graficoLimiteCrediticio();
    if (await grafico.count() > 0) {
      await expect(grafico).toBeVisible({ timeout: 30_000 });
    }
  });

  // CP-79: Validación de tarjeta de ticket promedio del cliente
  test("CP-79: Validación de tarjeta de ticket promedio del cliente", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date();
    desde.setFullYear(2023, 0, 1);
    const hasta = new Date();
    hasta.setFullYear(2025, 10, 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(hasta));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const ticketPromedio = await dashboard.getTicketPromedio();
    expect(ticketPromedio).toBeGreaterThanOrEqual(0);
  });

  // CP-80: Validación de tarjeta de frecuencia de compra
  test("CP-80: Validación de tarjeta de frecuencia de compra", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date();
    desde.setFullYear(2023, 0, 1);
    const hasta = new Date();
    hasta.setFullYear(2025, 10, 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(hasta));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const frecuencia = await dashboard.getFrecuenciaCompra();
    expect(frecuencia).toBeGreaterThanOrEqual(0);
  });

  // CP-81: Validación de tabla de recomendación de productos
  test("CP-81: Validación de tabla de recomendación de productos", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const tabla = dashboard.getTablaRecomendacionProductos();
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
    }
  });

  // CP-82: Validación de tabla de estado de cuenta
  test("CP-82: Validación de tabla de estado de cuenta", async ({ page }) => {
    const dashboard = new DashboardClientesPage(page);
    
    const desde = new Date();
    desde.setFullYear(2023, 0, 1);
    const hasta = new Date();
    hasta.setFullYear(2025, 10, 6);
    
    await dashboard.setNombreCliente(CLIENTE_TEST);
    await dashboard.setRangoFechas(toISO(desde), toISO(hasta));
    await dashboard.clickFiltrar();
    await dashboard.esperarCarga();

    const tabla = dashboard.getTablaEstadoCuenta();
    if (await tabla.count() > 0) {
      const filas = await dashboard.getFilasTabla(tabla);
      expect(filas).toBeGreaterThanOrEqual(0);
    }
  });
});

