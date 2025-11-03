// tests/front-end/reporte-ventas/pages/ReporteVentasPage.ts
import { expect, Locator, Page } from "@playwright/test";

export default class ReporteVentasPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ========================= Navegación / carga =========================
  async ir(baseUrl: string) {
    const url = `${baseUrl}/reportes/ventas`;
    await this.page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  /** Espera robusta a que la tabla de Tabulator esté visible (app lenta). */
  async esperarLista() {
    const tabulator = this.page.locator("div.tabulator");
    const deadline = Date.now() + 120_000; // 2 min

    while (Date.now() < deadline) {
      if ((await tabulator.count()) > 0) {
        await expect(tabulator.first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
        const headers = this.page.locator(".tabulator .tabulator-header, .tabulator .tabulator-tableholder");
        if (await headers.first().isVisible().catch(() => false)) return;
      }
      await this.page.waitForTimeout(500);
    }
    await expect(tabulator.first()).toBeVisible({ timeout: 5_000 });
  }

  // ========================= Filtros de fecha =========================
  async setRangoFechas(desdeISO: string, hastaISO: string) {
    // 1) Preferible abrir popover y rellenar ambos extremos en una sola pasada
    const opened = await this.abrirDatePopover();
    if (opened) {
      const okStart = await this._fillRangeSegments(0, desdeISO);
      const okEnd = await this._fillRangeSegments(1, hastaISO);
      await this._clickOkSiExiste(); // si hay botón "Ok", confírmalo
      if (okStart && okEnd) return;
    }
    // 2) Fallback: intentos por label (por si el control no es de segmentos)
    await this.setFechaDesde(desdeISO);
    await this.setFechaHasta(hastaISO);
  }

  async setFechaDesde(yyyy_mm_dd: string) {
    await this._setDateByLabel(/fecha.*(desde|inicio)/i, yyyy_mm_dd);
  }

  async setFechaHasta(yyyy_mm_dd: string) {
    await this._setDateByLabel(/fecha.*(hasta|fin)/i, yyyy_mm_dd);
  }

  /**
   * Abre el popover del selector de fechas tocando el chip/campo.
   * Devuelve true si detectó los segmentos visibles.
   */
  private async abrirDatePopover(): Promise<boolean> {
    // Intento 1: el contenedor de los "chips" de fecha (HeroUI/react-aria suele usar data-slot=input-field)
    const chip = this.page.locator('[data-slot="input-field"]').first();
    if (await chip.count()) {
      await chip.click({ timeout: 10_000 }).catch(() => {});
    }

    // Intento 2: cualquier control que, al hacer click, muestre segmentos
    if (!(await this._haySegmentosVisibles())) {
      const anyChip = this.page.locator('button:has(svg), div:has([class*="calendar"])').first();
      if (await anyChip.count()) {
        await anyChip.click({ timeout: 10_000 }).catch(() => {});
      }
    }

    // Espera corta a que aparezcan segmentos
    return await this._esperaSegmentos(5_000);
  }

  private async _haySegmentosVisibles(): Promise<boolean> {
    const seg = this.page.locator('[data-slot="segment"][role="spinbutton"]');
    if ((await seg.count()) === 0) return false;
    return await seg.first().isVisible().catch(() => false);
  }

  private async _esperaSegmentos(timeout = 5_000): Promise<boolean> {
    const seg = this.page.locator('[data-slot="segment"][role="spinbutton"]');
    try {
      await seg.first().waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rellena segmentos por índice (0 = Inicio, 1 = Fin).
   * Requiere popover abierto.
   */
  private async _fillRangeSegments(index: number, iso: string): Promise<boolean> {
    const { y, m, d } = this._splitISO(iso);
    const segYear = this.page.locator('[data-type="year"][role="spinbutton"]').nth(index);
    const segMonth = this.page.locator('[data-type="month"][role="spinbutton"]').nth(index);
    const segDay = this.page.locator('[data-type="day"][role="spinbutton"]').nth(index);

    const exists =
      (await segYear.count()) > 0 && (await segMonth.count()) > 0 && (await segDay.count()) > 0;
    if (!exists) return false;

    const fill = async (seg: Locator, v: string) => {
      if (!(await seg.isVisible().catch(() => false))) return;
      await seg.click().catch(() => {});
      await seg.press("Control+A").catch(() => {});
      await seg.type(v, { delay: 15 }).catch(() => {});
    };

    await fill(segYear, y);
    await fill(segMonth, this._pad2(m));
    await fill(segDay, this._pad2(d));
    await segDay.press("Enter").catch(() => {}); // a veces aplica el valor
    return true;
  }

  /**
   * Método legacy: intenta por label; si no, busca segmentos globales.
   */
  private async _setDateByLabel(labelRe: RegExp, iso: string) {
    // 1) input visible asociado al label
    const input = this.page
      .getByLabel(labelRe)
      .locator('input[type="date"], input[type="text"], input')
      .first();

    if (await input.count()) {
      if (await input.isVisible().catch(() => false)) {
        await input.fill("");
        await input.fill(iso);
        await input.press("Enter").catch(() => {});
        return;
      }
    }

    // 2) abrir popover y rellenar el primer/segundo set según label
    const opened = await this.abrirDatePopover();
    if (opened) {
      const isStart = /desde|inicio/i.test(String(labelRe));
      const ok = await this._fillRangeSegments(isStart ? 0 : 1, iso);
      await this._clickOkSiExiste();
      if (ok) return;
    }

    throw new Error(`No pude establecer la fecha para ${labelRe} con valor ${iso}`);
  }

  private _splitISO(iso: string) {
    const [y, m, d] = iso.split("-");
    return { y, m, d };
  }

  private _pad2(v: string) {
    return v.toString().padStart(2, "0");
  }

  private async _clickOkSiExiste() {
    const okBtn = this.page.getByRole("button", { name: /^ok$/i }).first();
    if (await okBtn.count()) {
      await okBtn.click().catch(() => {});
    }
  }

  // ========================= Acciones =========================
  async clickBuscar() {
    const btn = this.page.getByRole("button", { name: /filtrar|buscar/i }).first();
    if (await btn.count()) {
      await btn.click({ timeout: 30_000 }).catch(() => {});
    } else {
      const candidate = this.page.locator('button:has-text("Filtrar"), [class*=btn]:has-text("Filtrar")').first();
      await candidate.click({ timeout: 30_000 }).catch(() => {});
    }
  }

  // ========================= Tabla / datos =========================
  async waitForTabla() {
    const rows = this.page.locator(".tabulator .tabulator-row");
    const pager = this.page.locator('text=/Mostrando\\s+\\d+\\s+de\\s+\\d+\\s+p(ág|ag)inas/i').first();
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if ((await rows.count()) > 0 || (await pager.count()) > 0) return;
      await this.page.waitForTimeout(500);
    }
  }

  async getFilasTabla(): Promise<number> {
    return await this.page.locator(".tabulator .tabulator-row").count();
  }

  /** Prefiere footer (bottomCalc). Si no existe, suma la última columna numérica visible. */
  async getSumatoriaPaginaActual(): Promise<number> {
    const footerLast = this.page.locator(".tabulator .tabulator-calcs .tabulator-cell").last();
    if (await footerLast.count()) {
      const txt = (await footerLast.innerText()).trim();
      const val = this._textoAMonedaSeguro(txt);
      if (!Number.isNaN(val) && val !== 0) return val;
    }
    return await this.sumarColumnaTotalVisible();
  }

  async sumarColumnaTotalVisible(): Promise<number> {
    const rows = this.page.locator(".tabulator .tabulator-row");
    const n = await rows.count();
    let suma = 0;

    for (let i = 0; i < n; i++) {
      const celdas = rows.nth(i).locator(".tabulator-cell");
      const cCount = await celdas.count();
      if (cCount === 0) continue;

      let valorTomado = 0;
      for (let idx = cCount - 1; idx >= 0; idx--) {
        const txt = (await celdas.nth(idx).innerText().catch(() => "")).trim();
        const num = this._textoAMonedaSeguro(txt);
        if (!Number.isNaN(num) && Math.abs(num) > 0) {
          valorTomado = num;
          break;
        }
      }
      suma += valorTomado;
    }

    return suma;
  }

  /** Busca sumatoria global si la UI la expone; si no, 0. */
  async getSumatoriaGlobal(): Promise<number> {
    const probes: Locator[] = [
      this.page.getByTestId("sum-global"),
      this.page.locator('[data-qa="sum-global"]').first(),
      this.page.locator(".total-global").first(),
      this.page
        .locator('div:has-text("Mostrando"):below(:text("Mostrando"))')
        .locator("text=/[0-9][0-9 .,-]+/")
        .last(),
    ];

    for (const loc of probes) {
      if (await loc.count()) {
        const txt = (await loc.innerText().catch(() => "")).trim();
        const num = this._textoAMonedaSeguro(txt);
        if (!Number.isNaN(num) && Math.abs(num) > 0) return num;
      }
    }
    return 0;
    }

  async getContadorResultados(): Promise<{ paginaActual: number; totalPaginas: number }> {
    const counter = this.page
      .locator('text=/Mostrando\\s+(\\d+)\\s+de\\s+(\\d+)\\s+p(ág|ag)inas/i')
      .first();

    if (await counter.count()) {
      const txt = await counter.innerText();
      const m = txt.match(/Mostrando\s+(\d+)\s+de\s+(\d+)\s+p(ág|ag)inas/i);
      if (m) {
        return {
          paginaActual: parseInt(m[1], 10),
          totalPaginas: parseInt(m[2], 10),
        };
      }
    }
    return { paginaActual: 1, totalPaginas: 1 };
  }

  btnSiguiente() {
    return this.page.getByRole("button", { name: /^Siguiente$/i }).first();
  }

  btnAnterior() {
    return this.page.getByRole("button", { name: /^Anterior$/i }).first();
  }

  async goToSiguientePagina() {
    const btn = this.btnSiguiente();
    if (await btn.count()) await btn.click({ timeout: 30_000 }).catch(() => {});
  }

  async goToPaginaAnterior() {
    const btn = this.btnAnterior();
    if (await btn.count()) await btn.click({ timeout: 30_000 }).catch(() => {});
  }

  // ========================= Exportación CSV (spinner-driven) =========================
  async exportarCsvConEsperaLenta(timeoutMs = 180_000) {
    const byRole = this.page.getByRole("button", { name: /csv|descargar|exportar/i });
    let candidato: Locator | null = null;

    if ((await byRole.count()) > 0) {
      candidato = byRole.first();
    } else {
      candidato = this.page.locator("div.w-full.flex.flex-row button").last();
      if ((await candidato.count()) === 0) {
        throw new Error("No encontré control de exportación CSV.");
      }
    }

    await candidato.click().catch(() => {});
    const spinner = this.page.getByRole("progressbar", { name: /loading/i }).first();
    await spinner.waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
    await spinner.waitFor({ state: "detached", timeout: timeoutMs }).catch(() => {});
  }

  // ========================= Empty state =========================
  emptyState() {
    return this.page.locator("text=/sin resultados|no se encontraron resultados|no hay datos/i");
  }

  async estaVacioPorTextoOUnoCeroFilas(): Promise<boolean> {
    const texto = this.emptyState();
    if ((await texto.count()) > 0 && (await texto.first().isVisible().catch(() => false))) return true;
    const filas = await this.getFilasTabla();
    return filas === 0;
  }

  // ========================= Utils =========================
  private _textoAMonedaSeguro(txt: string): number {
    if (!txt) return 0;
    let s = txt.replace(/\u00A0/g, " ").replace(/[^\d,.\-\s]/g, "").trim();

    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decimalIsComma = lastComma > lastDot;

    if (decimalIsComma) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      s = s.replace(/,(?=\d{3}(\D|$))/g, "");
    }

    const num = parseFloat(s);
    return Number.isFinite(num) ? num : 0;
  }
}
