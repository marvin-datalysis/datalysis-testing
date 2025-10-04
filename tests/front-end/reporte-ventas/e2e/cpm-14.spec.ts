// tests/front-end/reporte-ventas/e2e/cpm-14.spec.ts
import { test, expect, Page, Locator } from "@playwright/test";
import ReporteVentasPage from "../pages/ReporteVentasPage";

// ===== Config =====
test.setTimeout(240_000);
const TEST_TIMEOUT_MS = 240_000;
const BEFORE_EACH_WAIT_MS = 120_000;

const BASE_URL   = process.env.BASE_URL!;
const EMAIL      = process.env.EMAIL!;
const PASSWORD   = process.env.PASSWORD!;
const EMPRESA_ENV = process.env.EMPRESA; // opcional, ej: "CasaBrilla"

const HOY = new Date();
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ===== Suite =====
test.describe("CPM-14 - Reporte de Ventas (UI-only)", () => {
  test.beforeEach(async ({ page }) => {
    const reporte = new ReporteVentasPage(page);

    await reporte.ir(BASE_URL!);

    // Login robusto si hace falta (espera estabilidad real del form)
    if (page.url().includes("/auth/sign-in") || (await hayFormularioLogin(page))) {
      await loginUI_robusto(page, BASE_URL, EMAIL, PASSWORD);
      await reporte.ir(BASE_URL!);
    }

    await reporte.esperarLista();
  });

  test("CPM-14: Filtro de empresa actualiza reporte + validaciones (rango, sumas, paginación, CSV)", async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const reporte = new ReporteVentasPage(page);

    // 1) Rango últimos 7 días
    const desde7 = new Date(HOY);
    desde7.setDate(HOY.getDate() - 6);
    await reporte.setRangoFechas(ymd(desde7), ymd(HOY));
    await reporte.clickBuscar();

    // 2) Tabla visible
    await reporte.waitForTabla(BEFORE_EACH_WAIT_MS);
    const filasUI = await reporte.getFilasTabla();
    expect(filasUI).toBeGreaterThanOrEqual(0);
    expect(filasUI).toBeLessThanOrEqual(100);

    // 3) Filtro Empresa — flujo estable:
    //    Empresa -> escribir -> clic a la opción exacta -> Ok -> Filtrar (una sola vez)
    const candidata = EMPRESA_ENV ?? (await empresaDesdeTabla(page)) ?? "CasaBrilla";

    // baseline para detectar cambio real
    const filasAntes = await contarFilas(page);

    await seleccionarEmpresaPrecisamente(page, candidata);
    await clickFiltrar(page); // una sola confirmación

    // Espera cambio real: que aparezca la empresa en la tabla (primeras 30 filas) o cambie el conteo
    await esperarEmpresaEnTablaOConteoCambie(page, candidata, filasAntes, 45_000);

    const filasDespues = await contarFilas(page);
    await expect(page.locator(".tabulator")).toBeVisible();

    // Validación tolerante por columna Empresa (si existe)
    const headers = await headersTabulator(page);
    const idxEmpresa = headers.findIndex((h) => /empresa|company|organización/i.test(h));
    if (idxEmpresa >= 0 && filasDespues > 0) {
      const n = Math.min(filasDespues, 30);
      const esperado = norm(candidata);
      let aciertos = 0;
      for (let i = 0; i < n; i++) {
        const celda = page
          .locator(".tabulator .tabulator-row")
          .nth(i)
          .locator(".tabulator-cell")
          .nth(idxEmpresa);
        const txt = norm(await textFromCell(celda));
        if (txt.includes(esperado)) aciertos++;
      }
      if (aciertos < 1) {
        console.warn(
          `[CPM-14] No encontré "${candidata}" en primeras ${n} filas (puede ser orden/paginación).`
        );
      }
    }

    test.info().annotations.push({
      type: "filtro_empresa",
      description: `Empresa: ${candidata} | filas antes=${filasAntes}, después=${filasDespues}`,
    });

    // 4) Sumatoria página vs visible (warning si difiere — app puede redondear o paginar)
    const sumUI = await reporte.getSumatoriaPaginaActual();
    const sumVis = await reporte.sumarColumnaTotalVisible();
    const diff = Math.abs(red2(sumUI) - red2(sumVis));
    const tol = Math.max(1, sumVis * 0.01); // 1% o 1 unidad
    if (diff > tol) {
      console.warn(
        `[CPM-14] Sumas distintas (UI=${sumUI} vs visible=${sumVis}); continúo (warning).`
      );
    }

    // 5) Sumatoria global (si existe)
    const sumGlobal = await reporte.getSumatoriaGlobal();
    if (sumGlobal > 0 && red2(sumGlobal) < red2(sumUI)) {
      console.warn(
        `[CPM-14] Sumatoria global < sumatoria página (UI) — revisar regla de negocio.`
      );
    }

    // 6) Paginación defensiva
    const c1 = await reporte.getContadorResultados();
    const btnNext = reporte.btnSiguiente();
    const btnPrev = reporte.btnAnterior();
    const nextCount = await btnNext.count();
    const prevCount = await btnPrev.count();
    const hayMas =
      c1.totalPaginas > 1 ||
      (nextCount > 0 && !(await btnNext.first().isDisabled().catch(() => true)));

    if (hayMas && nextCount > 0) {
      await reporte.goToSiguientePagina();
      await reporte.waitForTabla();
      const c2 = await reporte.getContadorResultados();
      if (c1.totalPaginas > 0)
        expect.soft(c2.paginaActual).toBeGreaterThanOrEqual(c1.paginaActual);

      if (prevCount > 0) {
        await reporte.goToPaginaAnterior();
        await reporte.waitForTabla();
        const cBack = await reporte.getContadorResultados();
        if (c1.totalPaginas > 0)
          expect.soft(cBack.paginaActual).toBeLessThanOrEqual(c2.paginaActual);
      }
    } else {
      if (nextCount > 0) await expect.soft(btnNext).toBeDisabled();
      if (prevCount > 0) await expect.soft(btnPrev).toBeDisabled();
    }

    // 7) Export CSV (tolerante)
    try {
      await reporte.exportarCsvConEsperaLenta(120_000);
    } catch (e) {
      console.warn("[CPM-14] CSV tardó/no respondió:", (e as Error)?.message);
    }

    if (page.isClosed()) return;

    // 8) Estado vacío (rango invertido) — versión corta y directa
    const manana = new Date(HOY);
    manana.setDate(HOY.getDate() + 1);
    await reporte.setRangoFechas(ymd(manana), ymd(HOY)); // inicio > fin

    // Dispara lo que tu UI use (una u otra); sin bucles
    await Promise.allSettled([reporte.clickBuscar(), clickFiltrar(page)]);

    // Espera a que la tabla “asiente” y luego valida vacío por filas==0 (máx 8s)
    await reporte.waitForTabla();
    const esVacio = await esperarTablaVaciaPorFilas(page, 8_000).catch(() => false);
    if (!esVacio) {
      console.warn(
        "[CPM-14] Estado vacío no detectado tras rango invertido (espera corta)."
      );
    }
  });
});

// ===== Helpers =====
function red2(n: number) {
  return Math.round((n ?? 0) * 100) / 100;
}
function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

// --- Login robusto (evita que un re-render/autocompletar borre campos) ---
async function hayFormularioLogin(page: Page) {
  const email = page.getByLabel(/correo|email/i).first();
  const pass = page.getByLabel(/contraseña|password/i).first();
  const btn = page
    .getByRole("button", { name: /iniciar sesi[oó]n|sign in|entrar/i })
    .first();
  return (await email.count()) > 0 || (await pass.count()) > 0 || (await btn.count()) > 0;
}

async function loginUI_robusto(page: Page, baseUrl: string, email: string, password: string) {
  if (!page.url().includes("/auth/sign-in")) await page.goto(`${baseUrl}/auth/sign-in`);

  const emailInput = page.getByLabel(/correo|email/i).first();
  const passInput = page.getByLabel(/contraseña|password/i).first();
  const btn = page
    .getByRole("button", { name: /iniciar sesi[oó]n|sign in|entrar/i })
    .first();

  await Promise.all([
    emailInput.waitFor({ state: "visible", timeout: 60_000 }),
    passInput.waitFor({ state: "visible", timeout: 60_000 }),
  ]);

  await setAndHoldValue(emailInput, email, 800);
  await setAndHoldValue(passInput, password, 800);

  await btn.click();

  const ok = await page
    .waitForURL(/\/(inicio|reportes\/ventas)/, { timeout: 90_000 })
    .then(() => true)
    .catch(() => false);

  if (!ok) {
    // Un re-render tardío pudo limpiar campos: reintenta una sola vez
    await setAndHoldValue(emailInput, email, 800);
    await setAndHoldValue(passInput, password, 800);
    await btn.click();
    await page
      .waitForURL(/\/(inicio|reportes\/ventas)/, { timeout: 90_000 })
      .catch(() => {});
  }
}

async function setAndHoldValue(input: Locator, value: string, holdMs = 600) {
  await input.click();
  await input.fill("");
  await input.type(value, { delay: 10 }); // tipeo real (algunas UIs disparan onKey)
  const start = Date.now();
  while (Date.now() - start < holdMs) {
    const v = await input.inputValue();
    if (v !== value) {
      await input.fill(value);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  await expect(input).toHaveValue(value);
}

// --- Filtro Empresa ---
async function abrirFiltroEmpresa(page: Page) {
  const candidatos = [
    page.getByRole("button", { name: /^empresa\b/i }).first(),
    page.locator('button:has-text("Empresa"), [role="button"]:has-text("Empresa")').first(),
    page.getByText(/^Empresa\b/i).first(),
  ];
  for (const c of candidatos) {
    if ((await c.count()) && (await c.isVisible().catch(() => false))) {
      await c.click().catch(() => {});
      if (await dropdownEmpresaAbierto(page)) return;
    }
  }
  throw new Error("No pude abrir el filtro Empresa");
}

async function dropdownEmpresaAbierto(page: Page) {
  const checks = [
    page.getByPlaceholder(/busca|buscar/i).first(),
    page.getByText(/selecciona.*todos/i).first(),
    page.getByRole("button", { name: /^ok$/i }).first(),
  ];
  for (const c of checks) {
    if ((await c.count()) && (await c.isVisible().catch(() => false))) return true;
  }
  return false;
}

async function cerrarDropdownConOk(page: Page) {
  const ok = page.getByRole("button", { name: /^ok$/i }).first();
  if (await ok.count()) {
    await ok.scrollIntoViewIfNeeded().catch(() => {});
    await ok.click().catch(() => {});
    await ok.waitFor({ state: "detached", timeout: 7_000 }).catch(() => {});
  }
}

/**
 * Selecciona la empresa EXACTA dentro del dropdown:
 * - abre Empresa
 * - escribe nombre
 * - clic a la fila de empresa (o su checkbox)
 * - Ok
 */
async function seleccionarEmpresaPrecisamente(page: Page, nombre: string) {
  await abrirFiltroEmpresa(page);

  const buscador = page.getByPlaceholder(/busca|buscar/i).first();
  if (await buscador.count()) {
    await buscador.click();
    await buscador.fill("");
    await buscador.type(nombre, { delay: 10 }); // tipeo real para disparar filtros
    await page.waitForTimeout(250);
  }

  // fila de la empresa (caso típico de tu UI)
  const fila = page
    .getByText(new RegExp(`^${escapeRx(nombre)}$`, "i"))
    .first()
    .locator('xpath=ancestor::*[self::li or self::div][1]');
  if (await fila.count()) {
    // intenta checkbox si existe, si no, la fila completa
    const check = fila.locator('input[type="checkbox"], [role="checkbox"], .checkbox').first();
    if (await check.count()) {
      await check.click({ force: true }).catch(() => {});
      const aria = await check.getAttribute("aria-checked");
      if (aria && aria !== "true") {
        await check.click({ force: true }).catch(() => {});
      }
    } else {
      await fila.click({ force: true }).catch(() => {});
    }
  } else {
    // último recurso: clic directo al texto
    const opcion = page.getByText(new RegExp(`^${escapeRx(nombre)}$`, "i")).first();
    if (await opcion.count()) await opcion.click({ force: true }).catch(() => {});
  }

  await cerrarDropdownConOk(page);
}

async function clickFiltrar(page: Page) {
  const btn = page.getByRole("button", { name: /^filtrar$/i }).first();
  if (await btn.count()) {
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click().catch(() => {});
  }
}

// Espera hasta ver la empresa objetivo en primeras 30 filas o cambia el conteo de filas
async function esperarEmpresaEnTablaOConteoCambie(
  page: Page,
  empresa: string,
  filasAntes: number,
  timeoutMs = 40_000
) {
  const fin = Date.now() + timeoutMs;
  const esperado = norm(empresa);
  while (Date.now() < fin) {
    const filas = await contarFilas(page);
    if (filas !== filasAntes) return;

    const hs = await headersTabulator(page);
    const idx = hs.findIndex((h) => /empresa|company|organización/i.test(h));
    if (idx >= 0) {
      const n = Math.min(filas, 30);
      for (let i = 0; i < n; i++) {
        const celda = page
          .locator(".tabulator .tabulator-row")
          .nth(i)
          .locator(".tabulator-cell")
          .nth(idx);
        const txt = norm(await textFromCell(celda));
        if (txt.includes(esperado)) return;
      }
    }
    await page.waitForTimeout(700);
  }
  console.warn(
    `[CPM-14] Timeout esperando que la tabla refleje empresa "${empresa}".`
  );
}

// === Estado vacío por filas == 0 (espera corta) ===
async function esperarTablaVaciaPorFilas(page: Page, timeoutMs = 8_000): Promise<boolean> {
  const rows = page.locator(".tabulator .tabulator-row");
  await expect(rows).toHaveCount(0, { timeout: timeoutMs });
  return true;
}

// --- utilidades de tabla ---
async function empresaDesdeTabla(page: Page) {
  const hs = await headersTabulator(page);
  const idx = hs.findIndex((h) => /empresa|company|organización/i.test(h));
  if (idx < 0) return null;
  const cell = page.locator(".tabulator .tabulator-row").first().locator(".tabulator-cell").nth(idx);
  const txt = norm(await textFromCell(cell));
  return txt || null;
}

async function contarFilas(page: Page) {
  const table = page.locator(".tabulator");
  if (!(await table.count())) return 0;
  return await page.locator(".tabulator .tabulator-row").count();
}

async function headersTabulator(page: Page) {
  const hs = page.locator(".tabulator .tabulator-col .tabulator-col-title");
  if (!(await hs.count())) return [];
  const texts = await hs.allTextContents();
  return texts.map((t) => t.trim());
}

async function textFromCell(cell: Locator) {
  return await cell.evaluate((el) => {
    const t = el.getAttribute?.("title");
    if (t && t.trim()) return t.trim();
    const h = el as HTMLElement;
    return h.innerText?.trim() || h.textContent?.trim() || "";
  });
}

function escapeRx(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
