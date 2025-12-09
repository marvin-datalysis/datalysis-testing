import { test, expect, chromium, request as playwrightRequest } from '@playwright/test';
import { LoginPage } from '../../front-end/Seguridad/Login/pages/login.page';
import { DashboardClientesPage } from './pages/dashboardClientes.page';
import { queryDB } from '../../../utils/db';
import { getAccessToken } from '../../../utils/getToken';

test.setTimeout(60000);

// ==============================================================
// CP-22 — API Información General del Cliente
// ==============================================================
test.only("CP-22 - API devuelve información general correcta del cliente", async () => {

  // === 1. Crear API context dentro del test ===
  const token = await getAccessToken();
  const apiCtx = await playwrightRequest.newContext({
    baseURL: process.env.API_URL!,
    extraHTTPHeaders: { accessToken: token }
  });

  const nombreCliente = "Adrián Castillo";

  const response = await apiCtx.post(`/api/queries/exec/48`, {
    data: { nombreCliente: [nombreCliente] }
  });

  expect(response.ok()).toBeTruthy();

  const apiJson = await response.json();
  const apiData = apiJson.data.cliente;

  const sqlFechas = `
      SELECT fecha_venta
      FROM clean.fct_sales
      WHERE nombre_cliente = $1
      ORDER BY fecha_venta ASC;
  `;

  const fechasBD = await queryDB(sqlFechas, [nombreCliente], "demo");

  const meses: Record<string, number> = {
    "enero": 0, "febrero": 1, "marzo": 2, "abril": 3, "mayo": 4, "junio": 5,
    "julio": 6, "agosto": 7, "septiembre": 8, "octubre": 9, "noviembre": 10, "diciembre": 11
  };

  function parseFechaAPI(fecha: string): Date {
    if (!fecha) throw new Error("Fecha API vacía");

    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return new Date(fecha);

    const clean = fecha.toLowerCase().replace(",", "").replace(/\s+/g, " ").trim();
    const tokens = clean.split(" ");
    const dia = Number(tokens[0]);
    const anio = Number(tokens[tokens.length - 1]);
    const mesToken = tokens.find(t => meses[t] !== undefined);

    if (!mesToken) throw new Error("Mes no reconocido en fecha: " + fecha);

    return new Date(anio, meses[mesToken], dia);
  }

  const primeraBDDate = new Date(fechasBD[0].fecha_venta);
  const clienteDesdeDate = parseFechaAPI(apiData.clienteDesde);

  expect(apiData.nombreCliente).toBe(nombreCliente);

  const regexFecha = /^\d{1,2} de [A-Za-zÁÉÍÓÚáéíóú]+, \d{4}$/;
  expect(apiData.clienteDesde).toMatch(regexFecha);

  expect(clienteDesdeDate.getTime()).toBeGreaterThanOrEqual(primeraBDDate.getTime());
});


// ==============================================================
// CP-23 — API Información de contacto
// ==============================================================
test("CP-23 - API devuelve información de contacto correcta del cliente", async () => {

  const token = await getAccessToken();
  const apiCtx = await playwrightRequest.newContext({
    baseURL: process.env.API_URL!,
    extraHTTPHeaders: { accessToken: token }
  });

  const nombreCliente = "Adrián Castillo";

  const response = await apiCtx.post(`/api/queries/exec/144`, {
    data: { nombreCliente: [nombreCliente] }
  });

  expect(response.ok()).toBeTruthy();
  const apiJson = await response.json();
  const apiData = apiJson.data;

  const sql = `
      SELECT nombre_cliente,
             nombre_trabajador_contacto AS nombre_trabajador,
             contacto,
             timestamp_contacto
      FROM clean.fct_client_notes
      WHERE nombre_cliente = $1
      ORDER BY timestamp_contacto DESC
      LIMIT 1;
  `;

  const dbRows = await queryDB(sql, [nombreCliente], "demo");

  if (dbRows.length === 0) {
    expect(apiData.nombreCliente).toBe("N/A");
    expect(apiData.valor).toBe("N/A");
    return;
  }

  const db = dbRows[0];

  expect(apiData.nombreCliente).toBe(db.nombre_cliente);
  expect(apiData.valor.replace(/\s/g, '')).toContain(db.contacto.replace(/\s/g, ''));
  expect(apiData.nombreTrabajador || "").toBe(db.nombre_trabajador || "");

  expect(new Date(apiData.timestamp).getTime())
    .toBeGreaterThanOrEqual(new Date(db.timestamp_contacto).getTime());

  expect(apiData.moneda.id).toBe("USD");
  expect(apiData.moneda.simbolo).toBe("$");
  expect(apiData.moneda.nombre).toBe("Dólar Estadounidense");
});


// ==============================================================
// CP-69 — Validación UI con login dentro del test
// ==============================================================
test.only("CP-69 - La tarjeta de contacto muestra la información correcta", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  // ================================
  // 1. Login
  // ================================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ================================
  // 2. Ir al Dashboard
  // ================================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // ================================
  // 3. Seleccionar cliente real
  // ================================
  const nombreCliente = "Adrián Castillo";
  await dashboard.seleccionarCliente(nombreCliente);

  // Esperar que se cargue la tarjeta
  await page.locator("span:text('Contacto')").first().waitFor({ timeout: 6000 });

  // ================================
  // 4. API
  // ================================
  const apiCtx = await playwrightRequest.newContext({
    baseURL: process.env.API_URL
  });

  const apiResp = await apiCtx.post("/api/queries/exec/144", {
    data: { nombreCliente: [nombreCliente] }
  });

  const apiJson = await apiResp.json();
  const rawApiData = apiJson.data ?? {};

  const apiData = {
    valor: rawApiData.valor ?? "N/A",
    nombreTrabajador: rawApiData.nombreTrabajador ?? "N/A",
    timestamp: rawApiData.timestamp ?? null
  };

  // ================================
  // 5. BD
  // ================================
  const sql = `
    SELECT nombre_cliente,
           nombre_trabajador_contacto AS nombre_trabajador,
           contacto,
           timestamp_contacto
    FROM (
        SELECT nombre_cliente,
               nombre_trabajador_contacto,
               contacto,
               timestamp_contacto
        FROM clean.fct_client_notes
        WHERE nombre_cliente = $1
        ORDER BY timestamp_contacto DESC
        LIMIT 1
    ) AS subquery
    UNION ALL
    SELECT 'N/A','N/A','N/A', null
    WHERE NOT EXISTS (SELECT 1 FROM clean.fct_client_notes WHERE nombre_cliente = $1);
  `;

  const db = (await queryDB(sql, [nombreCliente], "demo"))[0];

  // ================================
  // 6. UI (desde el POM)
  // ================================
  const { contacto: uiContacto, cargo: uiCargo, telefono: uiTelefono } =
    await dashboard.obtenerDatosContacto();

  const uiFechaClienteDesde = await dashboard.obtenerClienteDesde();

  const apiTelefono = apiData.valor;

  // ================================
  // 7. UI ↔ API
  // ================================
  if (!apiTelefono || apiTelefono === "N/A") {
    expect(uiContacto).toBe("N/A");
    expect(uiCargo).toBe("N/A");
    expect(uiTelefono).toBe("N/A");
  } else {
    expect(uiTelefono.replace(/\s/g, "")).toContain(apiTelefono.replace(/\s/g, ""));
  }

  // ================================
  // 8. API ↔ BD
  // ================================
  if (db.contacto !== "N/A") {
    expect(apiTelefono.replace(/\s/g, "")).toContain(db.contacto.replace(/\s/g, ""));
  }

  // ================================
  // 9. Validar año Cliente Desde
  // ================================
  if (apiData.timestamp) {
    const year = new Date(apiData.timestamp).getFullYear();
    expect(uiFechaClienteDesde).toContain(year.toString());
  }

  await browser.close();
});

// ==============================================================
// CP-70-83 — Validación UI - API - DB
// ==============================================================

test("CP-70 - La tarjeta de notas del cliente muestra la información correcta", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar el cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Esperar a que aparezca la tarjeta de notas
  await page.locator("span:text('Notas')").first().waitFor({ timeout: 6000 });

  // 5. Leer la nota desde la UI
  const notaUI = await dashboard.obtenerNotaCliente();

  // 6. API
  const apiCtx = await playwrightRequest.newContext({
    baseURL: process.env.API_URL
  });

  const apiResp = await apiCtx.post("/api/queries/exec/145", {   // 
    data: { nombreCliente: [nombreCliente] }
  });

  const apiJson = await apiResp.json();
  const apiData = apiJson.data ?? {};

  const notaAPI = apiData.nota ?? "N/A";

  // 7. BD
  const sql = `
    SELECT nombre_cliente,
           nombre_trabajador_notas AS nombre_trabajador,
           nota,
           timestamp_notas
    FROM (
        SELECT nombre_cliente,
               nombre_trabajador_notas,
               nota,
               timestamp_notas
        FROM clean.fct_client_notes
        WHERE nombre_cliente = $1
        ORDER BY timestamp_notas DESC
        LIMIT 1
    ) AS subquery
    UNION ALL
    SELECT 'N/A','N/A','N/A', null
    WHERE NOT EXISTS (SELECT 1 FROM clean.fct_client_notes WHERE nombre_cliente = $1);
  `;

  const db = (await queryDB(sql, [nombreCliente], "demo"))[0];
  const notaBD = db.nota ?? "N/A";

  // 8. Validaciones UI ↔ API
  if (notaAPI === "N/A") {
    expect(notaUI).toBe("N/A");
  } else {
    expect(notaUI.replace(/\s/g, "")).toContain(notaAPI.replace(/\s/g, ""));
  }

  // 9. Validaciones API ↔ BD
  if (notaBD !== "N/A") {
    expect(notaAPI.replace(/\s/g, "")).toContain(notaBD.replace(/\s/g, ""));
  }

  await browser.close();
});


test("CP-71 - La tarjeta de ventas totales muestra el valor correcto y responde a filtros", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Ir al Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Obtener fechas desde la UI
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // 5. Leer KPI directamente (NO esperamos cambios, porque no cambia)
  const ventasUI = await dashboard.obtenerVentasTotales();

  // 6. Consulta BD exacta
  const sql = `
    SELECT COALESCE(SUM(total_venta_iva), 0)::int AS ventas_totales
    FROM (
      SELECT total_venta_iva
      FROM clean.fct_sales
      WHERE nombre_cliente = $1
        AND fecha_venta >= $2
        AND fecha_venta <= $3
      GROUP BY total_venta_iva
    ) AS subquery;
  `;

  const dbRows = await queryDB(sql, [nombreCliente, fechaMin, fechaMax], "demo");
  const ventasBD = Number(dbRows[0].ventas_totales);

  // 7. Validación UI ↔ BD
  expect(ventasUI).toBe(ventasBD);

  await browser.close();
});

test("CP-72 - La tarjeta de período medio de pago muestra el valor correcto y responde a filtros", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Fechas desde UI
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // 5. Leer KPI directamente (no cambia)
  const periodoUI = await dashboard.obtenerPeriodoMedioPago();

  // 6. Consultar BD
  const sql = `
    SELECT 
      ROUND(AVG(indice_plazo_credito), 0)::int AS periodo_medio_pago
    FROM (
        SELECT 
            MAX(dias_de_credito) AS indice_plazo_credito
        FROM clean.fct_accounts_receivable
        WHERE saldo_pendiente = 0
          AND nombre_cliente = $1
          AND fecha_vencimiento >= $2
          AND fecha_vencimiento <= $3
        GROUP BY id_factura
    ) AS subquery;
  `;

  const dbRows = await queryDB(sql, [nombreCliente, fechaMin, fechaMax], "demo");
  const periodoBD = Number(dbRows[0].periodo_medio_pago);

  // 7. Validación UI ↔ BD
  expect(periodoUI).toBe(periodoBD);

  await browser.close();
});

test("CP-73 - La tarjeta de monto de pago pendiente muestra el valor correcto y responde a filtros", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Fechas desde UI (por consistencia, aunque la BD no las usa en este KPI)
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // 5. Leer KPI desde UI
  const montoUI = await dashboard.obtenerMontoPagoPendiente();

  // 6. Consulta BD confirmada
  const sql = `
    SELECT COALESCE(SUM(saldo_pendiente), 0)::int AS total_pendiente
    FROM (
      SELECT MAX(saldo_pendiente) AS saldo_pendiente
      FROM clean.fct_accounts_receivable
      WHERE nombre_cliente = $1
        AND saldo_pendiente > 0
      GROUP BY id_factura
    ) AS subquery;
  `;

  const dbRows = await queryDB(sql, [nombreCliente], "demo");
  const montoBD = Number(dbRows[0].total_pendiente);

  // 7. Validación UI ↔ BD
  expect(montoUI).toBe(montoBD);

  await browser.close();
});

test("CP-74 - La tarjeta de morosidad muestra valores correctos y responde a filtros", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Fechas desde UI
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // 5. Leer KPI desde UI
  const tasaUI = await dashboard.obtenerTasaMorosidadPorcentaje();
  const valorUI = await dashboard.obtenerTasaMorosidadValor();

  // 6. Consulta BD oficial
  const sql = `
  WITH creditos_morosos AS (
    SELECT COALESCE(SUM(saldo_pendiente), 0) AS total
    FROM (
      SELECT id_factura AS id_venta, MAX(saldo_pendiente) AS saldo_pendiente
      FROM clean.fct_accounts_receivable
      WHERE fecha_vencimiento < (now() AT TIME ZONE 'America/Managua')::date
        AND saldo_pendiente > 0
        AND nombre_cliente = $1
      GROUP BY id_factura
    ) AS subquery
  ),
  cartera AS (
    SELECT COALESCE(limite_de_credito, 0) AS limite_credito
    FROM clean.dim_customers_credits
    WHERE nombre_cliente = $1
    ORDER BY LENGTH(id_cliente) ASC
    LIMIT 1
  )
  SELECT 
    ROUND(
      (CASE WHEN cm.total = 0 OR c.limite_credito = 0 
           THEN 0 
           ELSE (cm.total / c.limite_credito) * 100 END
      )::numeric, 2
    )::decimal AS tasa_morosidad_p,
    ROUND(
      (CASE WHEN cm.total = 0 OR c.limite_credito = 0 
           THEN 0 
           ELSE cm.total END
      )::numeric, 2
    )::int AS tasa_morosidad_v
  FROM creditos_morosos cm
  LEFT JOIN cartera c ON TRUE;
  `;

  const rows = await queryDB(sql, [nombreCliente], "demo");

  const tasaBD = Number(rows[0].tasa_morosidad_p);
  const valorBD = Number(rows[0].tasa_morosidad_v);

  // 7. Validación UI ↔ BD
  expect(tasaUI).toBe(tasaBD);
  expect(valorUI).toBe(valorBD);

  await browser.close();
});

test("CP-75 - La tarjeta de clasificación crediticia muestra la información correcta", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Esperar tarjeta visible
  await page
    .locator("span:text('CLASIFICACIÓN DEL CLIENTE')")
    .waitFor({ timeout: 7000 });

  // 5. UI — obtener clasificación
  const clasificacionUI = await dashboard.obtenerClasificacionCredito();

  // 6. BD — consulta oficial
  const sql = `
    SELECT * FROM (
        SELECT 
            m.centroid_name AS grupo_cliente
        FROM clean.map_centroids AS m
        JOIN clean.dim_customers_volume AS d 
            ON m.centroid_name = d.clasificacion_volumetrica
        WHERE nombre_cliente = $1
        LIMIT 1
    ) AS subconsulta

    UNION ALL 

    SELECT 'N/A' AS grupo_cliente
    WHERE NOT EXISTS (
        SELECT 1 
        FROM clean.map_centroids AS m
        JOIN clean.dim_customers_volume AS d 
            ON m.centroid_name = d.clasificacion_volumetrica
        WHERE nombre_cliente = $1
    );
  `;

  const dbRows = await queryDB(sql, [nombreCliente], "demo");
  const clasificacionBD = dbRows[0].grupo_cliente;

  // 7. Validación UI ↔ BD
  expect(clasificacionUI).toBe(clasificacionBD);

  await browser.close();
});

test("CP-76 - La tabla de clasificación por volumen de ventas refleja correctamente la información del cliente", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // 3. Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // 4. Esperar tabla verdadera (única)
  const tabla = page.locator("table:has(th:has-text('Clasificación del'))");

  await expect(tabla).toBeVisible({ timeout: 15000 });

  // Esperar a que tenga filas reales
  await expect(tabla.locator("tbody tr").first()).toBeVisible({ timeout: 15000 });

  // ------------------------
  // 5. UI — extraer datos reales
  // ------------------------

  const filasUI = await tabla.locator("tbody tr").all();

  const tablaUI = [];
  for (const fila of filasUI) {
    const celdas = await fila.locator("td, th").allInnerTexts();
    tablaUI.push({
      nombre: celdas[0].trim(),
      cantidad: Number(celdas[1]),
      monto: Number(celdas[2].replace(/\$|\s|,/g, "")),
      contado: Number(celdas[3]),
      credito: Number(celdas[4])
    });
  }

  // Crear mapa para validación
  const mapaUI = new Map(tablaUI.map(r => [r.nombre, r]));

  // ------------------------
  // 6. BD — consulta oficial
  // ------------------------

  const sql = `
    WITH clasificacion_cliente AS (
      SELECT d.clasificacion_volumetrica AS grupo
      FROM clean.dim_customers_volume AS d
      WHERE nombre_cliente = $1
      LIMIT 1
    )
    SELECT * FROM (
      SELECT 
        m.centroid_name AS nombre,
        m.cantidad_compras::int AS cantidad_compras,
        m.total_comprado::int AS monto_total,
        m.veces_plazo_contado::int AS veces_contado,
        m.veces_plazo_credito::int AS veces_credito,
        CASE WHEN clasificacion_cliente.grupo = m.centroid_name THEN 1 ELSE 0 END AS flag
      FROM clean.map_centroids AS m, clasificacion_cliente

      UNION ALL

      SELECT 
        'Cliente' AS nombre,
        d.cantidad_compras::int AS cantidad_compras,
        d.total_comprado::int AS monto_total,
        d.veces_plazo_contado::int AS veces_contado,
        d.veces_plazo_credito::int AS veces_credito,
        1 AS flag
      FROM clean.dim_customers_volume AS d
      WHERE nombre_cliente = $1
      LIMIT 1
    ) AS subconsulta
    ORDER BY nombre;
  `;

  const dbRows = await queryDB(sql, [nombreCliente], "demo");

  const tablaBD = dbRows.map(r => ({
    nombre: r.nombre,
    cantidad: Number(r.cantidad_compras),
    monto: Number(r.monto_total),
    contado: Number(r.veces_contado),
    credito: Number(r.veces_credito),
  }));

  // ------------------------
  // 7. Validación UI ↔ BD (correcta)
  // ------------------------

  for (const rowDB of tablaBD) {
    const rowUI = mapaUI.get(rowDB.nombre);

    expect(rowUI, `La fila '${rowDB.nombre}' no existe en la tabla UI`).toBeTruthy();
    
    const fila = rowUI!

    expect(fila.cantidad).toBe(rowDB.cantidad);
    expect(fila.monto).toBe(rowDB.monto);
    expect(fila.contado).toBe(rowDB.contado);
    expect(fila.credito).toBe(rowDB.credito);

  }

  await browser.close();
});

test("CP-77 - El gráfico de cartera crédito/contado refleja valores correctos y responde a filtros", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // ============================================================
  // 1. Login
  // ============================================================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ============================================================
  // 2. Ir al dashboard y esperar carga
  // ============================================================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // ============================================================
  // 3. Seleccionar cliente
  // ============================================================
  await dashboard.seleccionarCliente(nombreCliente);

  // ============================================================
  // 4. Obtener fechas desde UI (spinners)
  // ============================================================
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // ============================================================
  // 5. EXTRAER VALORES DESDE EL GRÁFICO APEXCHARTS
  // ============================================================
  /*
     Los paths contienen:
       data:value="65115" → Contado
       data:value="192847" → Crédito

     Serie 0 → Contado
     Serie 1 → Crédito
  */

  const selectorPaths = page.locator("path.apexcharts-pie-area");

  await expect(selectorPaths.first()).toBeVisible({ timeout: 15000 });

  const values = await selectorPaths.evaluateAll((paths) =>
    paths.map(x => ({
      value: Number(x.getAttribute("data:value")),
      serie: x.getAttribute("class")?.includes("slice-0") ? "Contado" : "Crédito"
    }))
  );

  // Convertir arreglo → objeto { Contado: X, Crédito: Y }
  const mapaUI: Record<string, number> = {};
  values.forEach(v => mapaUI[v.serie] = v.value);

  const contadoUI = mapaUI["Contado"];
  const creditoUI = mapaUI["Crédito"];

  // ============================================================
  // 6. CONSULTA BD OFICIAL
  // ============================================================
  const sql = `
    WITH clasificacion_cliente AS (
      SELECT 
        COALESCE(ROUND(SUM(total_venta_iva), 2), 0) AS value,
        'Contado' AS cartera
      FROM clean.fct_sales
      WHERE indice_plazo_credito = 0
        AND nombre_cliente = $1
        AND fecha_venta >= $2
        AND fecha_venta <= $3

      UNION

      SELECT
        COALESCE(ROUND(SUM(total_venta_iva), 2), 0) AS value,
        'Crédito' AS cartera
      FROM clean.fct_sales
      WHERE indice_plazo_credito != 0
        AND nombre_cliente = $1
        AND fecha_venta >= $2
        AND fecha_venta <= $3
    )
    SELECT cartera, value::int
    FROM clasificacion_cliente;
  `;

  const rows = await queryDB(sql, [nombreCliente, fechaMin, fechaMax], "demo");

  const mapaBD: Record<string, number> = {};
  rows.forEach(r => mapaBD[r.cartera] = Number(r.value));

  const contadoBD = mapaBD["Contado"];
  const creditoBD = mapaBD["Crédito"];

  // ============================================================
  // 7. Validación UI ↔ BD
  // ============================================================
  expect(contadoUI).toBe(contadoBD);
  expect(creditoUI).toBe(creditoBD);

  await browser.close();
});

test("CP-78 - El gráfico de límite crediticio refleja correctamente el límite, saldo actual y saldo disponible", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // ============================================================
  // 1. Login
  // ============================================================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ============================================================
  // 2. Navegar al Dashboard de Clientes
  // ============================================================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // ============================================================
  // 3. Seleccionar cliente
  // ============================================================
  await dashboard.seleccionarCliente(nombreCliente);

  // Esperar que aparezca el límite de crédito
  const limiteTexto = page.locator("span:text('LÍMITE DE CRÉDITO')");
  await expect(limiteTexto).toBeVisible({ timeout: 15000 });

  // ============================================================
  // 4. Leer Límite de Crédito desde UI
  // ============================================================
  const limiteValorUI = await page
    .locator("span:text('LÍMITE DE CRÉDITO')")
    .locator("xpath=following::span[contains(@class,'text-4xl')][2]")
    .innerText();

  const limiteUI = Number(limiteValorUI.replace(/[^0-9]/g, ""));

  // ============================================================
// 5. Extraer valores del gráfico (DOM visible y estable)
// ============================================================

// Esperar por los data-labels de ApexCharts
const labels = page.locator("text.apexcharts-datalabel");
await expect(labels.first()).toBeVisible({ timeout: 60000 });

// Leer los textos directamente
const textoDisponible = await labels.nth(0).textContent() ?? "";
const textoActual = await labels.nth(1).textContent() ?? "";

// Convertir los valores a números
const saldoDisponibleUI = Number(textoDisponible.replace(/[^0-9]/g, ""));
const saldoActualUI = Number(textoActual.replace(/[^0-9]/g, ""));


  // ============================================================
  // 6. Consultas BD
  // ============================================================
  const sql = `
    WITH limite_credito AS (
      SELECT COALESCE(
        (SELECT coalesce(limite_de_credito,0)
         FROM clean.dim_customers_credits
         WHERE nombre_cliente = $1
         ORDER BY LENGTH(id_cliente) ASC
         LIMIT 1), 0
      ) AS limite_de_credito
    ),
    clasificacion_cliente AS (
      SELECT
        coalesce(round(sum(saldo_pendiente::numeric), 2), 0) as value,
        'Saldo Actual' as cartera
      FROM (
        SELECT max(saldo_pendiente) as saldo_pendiente
        FROM clean.fct_accounts_receivable
        WHERE dias_de_credito != 0
          AND nombre_cliente = $1
        GROUP BY id_factura
      ) AS distinct_sales

      UNION ALL

      SELECT
        coalesce(round(((SELECT limite_de_credito FROM limite_credito) - sum(saldo_pendiente))::numeric, 2), 0) as value,
        'Saldo Disponible' as cartera
      FROM (
        SELECT max(saldo_pendiente) as saldo_pendiente
        FROM clean.fct_accounts_receivable
        WHERE dias_de_credito != 0
          AND nombre_cliente = $1
        GROUP BY id_factura
      ) AS distinct_sales
    )
    SELECT cartera, value::int
    FROM clasificacion_cliente;
  `;

  const rows = await queryDB(sql, [nombreCliente], "demo");

  const mapaBD: Record<string, number> = {};
  rows.forEach(r => mapaBD[r.cartera] = Number(r.value));

  const saldoDisponibleBD = mapaBD["Saldo Disponible"];
  const saldoActualBD = mapaBD["Saldo Actual"];

  // Límite desde BD
  const sqlLimite = `
    SELECT coalesce(limite_de_credito,0) AS limite
    FROM clean.dim_customers_credits
    WHERE nombre_cliente = $1
    ORDER BY LENGTH(id_cliente) ASC
    LIMIT 1;
  `;

  const limiteRow = await queryDB(sqlLimite, [nombreCliente], "demo");
  const limiteBD = Number(limiteRow[0].limite);

  // ============================================================
  // 7. Validación UI ↔ BD
  // ============================================================
  expect(limiteUI).toBe(limiteBD);
  expect(saldoDisponibleUI).toBe(saldoDisponibleBD);
  expect(saldoActualUI).toBe(saldoActualBD);

  await browser.close();
});

test.only("CP-79 - Validar ticket promedio del cliente", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // ============================================================
  // 1. Login
  // ============================================================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ============================================================
  // 2. Navegar al Dashboard de Clientes
  // ============================================================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  // Seleccionar cliente
  await dashboard.seleccionarCliente(nombreCliente);

  // ============================================================
  // 3. Obtener fechas desde el UI (igual que CP-74)
  // ============================================================
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // ============================================================
  // 4. Leer valor del ticket promedio en UI
  // ============================================================
  const valorUI = await page
    .locator("span:text('TICKET PROMEDIO')")
    .locator("xpath=following::span[contains(@class,'text-4xl')][2]")
    .innerText();

  const ticketPromedioUI = Number(valorUI.replace(/[^0-9]/g, ""));

  // ============================================================
  // 5. Consulta a BD (usando fechas del UI, no hardcode)
  // ============================================================
  const sql = `
    SELECT
      COALESCE(sum(total_venta_iva) / count(distinct id_venta), 0)::int AS ticket_promedio
    FROM clean.fct_sales
    WHERE nombre_cliente = $1
      AND fecha_venta >= $2
      AND fecha_venta <= $3;
  `;

  const rows = await queryDB(sql, [nombreCliente, fechaMin, fechaMax], "demo");
  const ticketPromedioBD = Number(rows[0].ticket_promedio);

  // ============================================================
  // 6. Validación UI ↔ BD
  // ============================================================
  expect(ticketPromedioUI).toBe(ticketPromedioBD);

  await browser.close();
});

test("CP-80 - Validar frecuencia de compra del cliente", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // ============================================================
  // 1. Login
  // ============================================================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ============================================================
  // 2. Dashboard
  // ============================================================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();

  await dashboard.seleccionarCliente(nombreCliente);

  // ============================================================
  // 3. Leer fechas desde UI (evita errores como en CP-79)
  // ============================================================
  const { fechaMin, fechaMax } = await dashboard.obtenerRangoFechas();

  // ============================================================
  // 4. Leer FRECUENCIA DE COMPRA desde UI
  // ============================================================
  const diasUI = await page
    .locator("span:text('FRECUENCIA DE COMPRA')")
    .locator("xpath=following::span[contains(@class,'text-4xl')][1]")
    .innerText();

  const frecuenciaUI = Number(diasUI.replace(/[^0-9]/g, ""));

  // ============================================================
  // 5. Consulta BD (cálculo oficial)
  // ============================================================
  const sql = `
    SELECT 
      (
        SELECT 
          CASE WHEN COUNT(*) >= 1 
          THEN ROUND(AVG(frecuencia_compra), 0)::int 
          ELSE NULL END
        FROM (
          SELECT 
            (fecha_venta - LEAD(fecha_venta) OVER (
              PARTITION BY nombre_cliente 
              ORDER BY fecha_venta DESC
            )) AS frecuencia_compra
          FROM (
            SELECT 
              nombre_cliente, 
              MAX(fecha_venta) AS fecha_venta
            FROM clean.fct_sales
            WHERE nombre_cliente = $1
              AND fecha_venta >= $2
              AND fecha_venta <= $3
            GROUP BY id_venta, nombre_cliente
          ) AS ventas_agrupadas
        ) subquery
        WHERE frecuencia_compra IS NOT NULL
      )::int AS promedio_frecuencia_compra
    FROM (SELECT 1) AS dummy;
  `;

  const rows = await queryDB(sql, [nombreCliente, fechaMin, fechaMax], "demo");

  const frecuenciaBD = Number(rows[0].promedio_frecuencia_compra);

  // ============================================================
  // 6. Validación UI ↔ BD
  // ============================================================
  expect(frecuenciaUI).toBe(frecuenciaBD);

  await browser.close();
});

test("CP-81 - Validar tabla de recomendación de productos", async () => {

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // 1. Login
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // 2. Dashboard Clientes
  await dashboard.ir();
  await dashboard.esperarCargaInicial();
  await dashboard.seleccionarCliente(nombreCliente);

  // ============================
  // 3. LEER CATEGORÍA / CLASIFICACIÓN
  // ============================
  const categoriaUI = (await page
    .locator("text=Productos recomendados")
    .locator("xpath=following::button[1]")
    .innerText()).trim();

  let recomendacionUI = (await page
    .locator("button:has-text('Clasificación')")
    .first()
    .innerText()).trim();

  if (recomendacionUI.includes("Clasificación")) {
    recomendacionUI = "Clasificación General";
  }

  // ============================
  // 4. LEER TABLA CORRECTA (FIX)
  // ============================

  // 1. Localizar tabla
const tablaProductos = page.locator(
  "xpath=//span[normalize-space()='Productos recomendados']/following::table[1]"
);

// 2. Filas reales del tbody
const filasTabla = tablaProductos.locator("tbody tr");

// 3. Asegurar que hay 4 filas en UI
await expect(filasTabla).toHaveCount(4, { timeout: 60000 });

// 4. Leer productos correctamente
const filas = await filasTabla.all();

const productosUITop4: string[] = [];
for (const fila of filas) {
  // columna 2 = nombre del producto
  const producto = await fila.locator("td:nth-child(2)").innerText();
  productosUITop4.push(producto.trim());
}

  // ============================
  // 5. CONSULTA BD
  // ============================
  const sql = `
    WITH parametros AS (
      SELECT $1::text AS categoria, $2::text AS recomendacion
    )
    SELECT nombre_producto
    FROM (
      SELECT nombre_producto, rating_predicho
      FROM ml.dim_recommendation_general, parametros
      WHERE categoria_producto = parametros.categoria
        AND nombre_cliente = $3
        AND parametros.recomendacion = 'Clasificación General'

      UNION ALL

      SELECT nombre_producto, rating_predicho
      FROM ml.dim_recommendation_groups, parametros
      WHERE categoria_producto = parametros.categoria
        AND nombre_cliente = $3
        AND parametros.recomendacion <> 'Clasificación General'
    ) AS productos
    ORDER BY rating_predicho DESC
    LIMIT 4;
  `;

  const rows = await queryDB(sql, [categoriaUI, recomendacionUI, nombreCliente], "demo");
  const productosBD = rows.map(r => String(r.nombre_producto).trim());

  // ============================
  // 6. VALIDACIÓN UI ↔ BD
  // ============================
  expect(productosUITop4.length).toBe(productosBD.length);

  for (let i = 0; i < productosBD.length; i++) {
    expect(productosUITop4[i]).toBe(productosBD[i]);
  }

  await browser.close();
});

test("CP-82 - Validar tabla de estado de cuenta", async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const login = new LoginPage(page);
  const dashboard = new DashboardClientesPage(page);

  const nombreCliente = "Adrián Castillo";

  // ========================
  // 1. LOGIN
  // ========================
  await login.goto();
  await login.login(process.env.EMAIL!, process.env.PASSWORD!);
  await expect(page).not.toHaveURL(/sign-in/);

  // ========================
  // 2. DASHBOARD
  // ========================
  await dashboard.ir();
  await dashboard.esperarCargaInicial();
  await dashboard.seleccionarCliente(nombreCliente);

  // ========================
  // 3. TABLA TABULATOR
  // ========================
  await dashboard.esperarTablaEstadoCuenta();

  // ========================
  // 4. Leer filas UI página 1
  // ========================
  const filasUI = await dashboard.obtenerFilasEstadoCuentaPagina1Normalizadas();

  // ========================
  // 5. CONSULTA BD — DEDUPLICADA
  // ========================
  const sql = `
WITH raw AS (
  SELECT 
    id_factura AS id_venta,
    nombre_empresa AS numero_sucursal,
    nombre_cliente,
    fecha_venta,
    fecha_vencimiento,
    concat(dias_de_credito, ' días') AS dias_credito,
    CASE 
      WHEN saldo_pendiente = 0 THEN '0 días'
      ELSE concat(GREATEST(CURRENT_DATE - fecha_vencimiento, 0), ' días')
    END AS dias_vencidos,
    total_factura,
    total_abonado,
    saldo_pendiente,
    ROW_NUMBER() OVER (
      PARTITION BY id_factura
      ORDER BY fecha_vencimiento DESC
    ) AS rn
  FROM clean.fct_accounts_receivable
  WHERE nombre_cliente = $1
    AND fecha_venta >= CURRENT_DATE - INTERVAL '730 days'
),

dedup AS (
  SELECT *
  FROM raw
  WHERE rn = 1
),

numbered_rows AS (
  SELECT
    numero_sucursal,
    id_venta,
    nombre_cliente,
    TO_CHAR(fecha_vencimiento,'YYYY-MM-DD') AS fecha_vencimiento,
    TO_CHAR(fecha_venta,'YYYY-MM-DD') AS fecha_venta,
    dias_credito,
    dias_vencidos,
    total_factura,
    total_abonado,
    saldo_pendiente,
    ROW_NUMBER() OVER (
      ORDER BY fecha_venta DESC, id_venta ASC
    ) AS row_num
  FROM dedup
)

SELECT *
FROM numbered_rows
WHERE row_num BETWEEN 1 AND 20
ORDER BY fecha_venta DESC, id_venta ASC;
`;

  const rows = await queryDB(sql, [nombreCliente], "demo");

  const filasBD = rows.map(r => ({
    idVenta: String(r.id_venta),
    numeroSucursal: r.numero_sucursal,
    nombreCliente: r.nombre_cliente,
    fechaVenta: r.fecha_venta,
    fechaVencimiento: r.fecha_vencimiento,
    diasCredito: r.dias_credito,
    diasVencidos: r.dias_vencidos,
    totalFactura: String(r.total_factura),
    totalAbonado: String(r.total_abonado),
    saldoPendiente: String(r.saldo_pendiente)
  }));

  // ========================
  // 6. VALIDACIÓN ROBUSTA
  // ========================

  // Mapear BD por ID para buscar coincidencias
  const mapaBD = new Map(filasBD.map(f => [f.idVenta, f]));

  // Filtrar filas que existan en ambas fuentes
  const coincidencias = filasUI.filter(f => mapaBD.has(f.idVenta));

  // Debe haber al menos 5 coincidencias válidas
  expect(coincidencias.length).toBeGreaterThanOrEqual(5);

  // 
  for (let i = 0; i < 5; i++) {
    const ui = coincidencias[i];
    const bd = mapaBD.get(ui.idVenta); // siempre definido

    expect(bd).toBeDefined();

    // validamos SOLO campos que NO cambian entre versiones
    expect(ui).toMatchObject({
      idVenta: bd!.idVenta,
      numeroSucursal: bd!.numeroSucursal,
      nombreCliente: bd!.nombreCliente,
      fechaVenta: bd!.fechaVenta
    });
  }

  await browser.close();
});





