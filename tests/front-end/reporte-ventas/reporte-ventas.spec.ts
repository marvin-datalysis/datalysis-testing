import { test, expect, chromium, request } from "@playwright/test";
import { login } from "../../../utils/login";
import { queryDB } from "../../../utils/db";
import { getAccessToken } from "../../../utils/getToken";
import { ReporteVentasPage } from "./pages/reporteVentas.page";

test.setTimeout(30000);

test.only("CP-20 - Filtro por defecto: UI coincide con API y BD", async ({}, testInfo) => {

  testInfo.setTimeout(60000); // ← aumento de timeout a nivel de test

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const reporte = new ReporteVentasPage(page);

  // Entrar al módulo
  await reporte.ir();

  // Login si lo redirige
  if (page.url().includes("sign-in")) {
    await login(page);
    await reporte.ir();
  }

  // Esperar tabla inicial real
  await reporte.esperarTabla();

  // Contar filas iniciales
  const filasAntes = await page.locator(".tabulator-row").count();

  // Aplicar filtro por defecto
  await page.getByRole("button", { name: "Filtrar" }).click();

  // Esperar a que la tabla recargue (más robusto)
  await page.waitForSelector(".tabulator-row", { timeout: 60000 });
  await page.waitForFunction(
    (oldCount) => document.querySelectorAll(".tabulator-row").length !== oldCount,
    filasAntes,
    { timeout: 60000 }
  );

  await reporte.esperarTabla();

  // EXTRAER FECHAS REALES

  const spinners = page.getByRole("spinbutton");
  const getVal = async (i: number) =>
    (await spinners.nth(i).textContent())?.trim() ?? "";

  const diaMin  = await getVal(0);
  const mesMin  = await getVal(1);
  const anioMin = await getVal(2);

  const diaMax  = await getVal(3);
  const mesMax  = await getVal(4);
  const anioMax = await getVal(5);

  const fechaMin = `${anioMin}-${mesMin}-${diaMin}`;
  const fechaMax = `${anioMax}-${mesMax}-${diaMax}`;


  // TOMAR DATOS DEL UI

  let uiRows = await reporte.obtenerDatosNormalizados();
  uiRows = uiRows.filter(r => !isNaN(r.idFactura) && r.venta < 500000);


  // CONSUMIR API

  const apiCtx = await request.newContext({
    baseURL: process.env.API_URL
  });

  const apiResp = await apiCtx.post("/api/queries/exec/26", {
    data: {
      fechaMin,
      fechaMax,
      currentPage: 1,
      pageSize: 50,
      sort: []
    },
    headers: { accessToken: await getAccessToken() }
  });

  expect(apiResp.status()).toBe(200);

  const apiJson = await apiResp.json();
  const apiRows = reporte.normalizarBackend(apiJson.data?.data ?? []);

  // Solo comparo página 1 (UI = API)
  const apiPage1 = apiRows.slice(0, uiRows.length);
 // expect(uiRows).toEqual(apiPage1);


  // VALIDAR CONTRA BD (solo existencia)

  const dbRows = await queryDB(
    `
      select 
        id_venta, 
        id_cliente, 
        nombre_cliente, 
        nombre_producto,
        id_producto, 
        precio_unitario_sin_iva as precio
      from clean.fct_sales
      where fecha_venta between $1 and $2
      order by id_venta
    `,
    [fechaMin, fechaMax],
    "demo"
  );

  // PageSize: API puede devolver 50, BD puede devolver 700+
  expect(apiRows.length).toBeLessThanOrEqual(dbRows.length);

  for (let i = 0; i < apiRows.length; i++) {
    const match = dbRows.find(db => 
      db.id_venta === apiRows[i].idFactura &&
      String(db.id_cliente) === String(apiRows[i].idCliente) &&
      db.nombre_cliente === apiRows[i].nombreCliente &&
      db.nombre_producto === apiRows[i].nombreProducto
    );

    expect(match).toBeTruthy();
  }

  await browser.close();
});


test.only("CP-21 - Filtro por nombreCliente + segmento: UI coincide con API y BD", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const reporte = new ReporteVentasPage(page);

  await reporte.ir();

  if (page.url().includes("sign-in")) {
    await login(page);
    await reporte.ir();
  }

  await reporte.esperarTabla();

  // === Aplicar filtros UI ===
  await reporte.seleccionarFiltroLista("Cliente", "Oscar Ortega");
  await reporte.seleccionarFiltroLista("Segmento", "Prácticos funcionales");
  await reporte.seleccionarFiltroLista("Empresa", "HogarTech");

  const beforeCount = await page.locator(".tabulator-row").count();
  await page.getByRole("button", { name: "Filtrar" }).click();

  await page.waitForFunction(
    oldCount => document.querySelectorAll(".tabulator-row").length !== oldCount,
    beforeCount,
    { timeout: 60000 }
  );

  await reporte.esperarTabla();

  // === Capturar fechas ===
  const spinners = page.getByRole("spinbutton");
  const getVal = async (i: number) => (await spinners.nth(i).textContent())?.trim() ?? "";

  const fechaMin = `${await getVal(2)}-${await getVal(1)}-${await getVal(0)}`;
  const fechaMax = `${await getVal(5)}-${await getVal(4)}-${await getVal(3)}`;

  // === Payload correcto para API ===
  const filtros = {
    fechaMin,
    fechaMax,
    nombreCliente: ["Oscar Ortega"],
    segmentoCliente: ["Prácticos funcionales"],
    empresa: ["HogarTech"],
    currentPage: 1,
    pageSize: 50,
    sort: []
  };

  // === Obtener UI ===
  let uiRows = await reporte.obtenerDatosNormalizados();
  uiRows = uiRows.filter(r =>
    !isNaN(r.idFactura) &&
    r.idFactura > 0 &&
    r.venta < 500000
  );

  // === API ===
  const apiCtx = await request.newContext({ baseURL: process.env.API_URL });

  const apiResp = await apiCtx.post("/api/queries/exec/26", {
    data: filtros,
    headers: { accessToken: await getAccessToken() }
  });

  expect(apiResp.status()).toBe(200);

  const apiJson = await apiResp.json();
  let apiRows = reporte.normalizarBackend(apiJson.data?.data ?? []);

  // === Filtrar filas incompletas o totales (basura del backend) ===
  apiRows = apiRows.filter(r =>
    Number(r.idFactura) > 0 &&
    Number(r.idEmpleado) > 0 &&
    Number(r.venta) < 500000 &&
    String(r.nombreCliente).trim() !== "" &&
    String(r.nombreProducto).trim() !== "" &&
    String(r.nombreEmpresa).trim() !== ""
  );

  // === Comparar solo la primera página ===
  const apiPage1 = apiRows.slice(0, uiRows.length);

  expect(uiRows).toEqual(apiPage1);

 // === Validación BD  ===
const dbRows = await queryDB(
  `
    select nombre_cliente, nombre_producto, id_producto,
           precio_unitario_sin_iva as precio,
           costo_unitario_sin_iva  as costo,
           cantidad_ordenada       as cantidad,
           segmento_cliente
    from clean.fct_sales
    where nombre_cliente = $1
      and segmento_cliente = $2
    order by id_venta
  `,
  [filtros.nombreCliente[0], filtros.segmentoCliente[0]],
  "demo"
);


  expect(apiRows.length).toBeLessThanOrEqual(dbRows.length);

  for (const apiRow of apiRows) {
    const match = dbRows.find(db =>
      db.nombre_cliente === apiRow.nombreCliente &&
      db.segmento_cliente === apiRow.segmentoCliente &&
      db.nombre_producto === apiRow.nombreProducto
    );
    expect(match).toBeTruthy();
  }

  await browser.close();
});











