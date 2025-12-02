// tests/front-end/dashboard-clientes/pages/DashboardClientesPage.ts
import { expect, Locator, Page } from "@playwright/test";

export default class DashboardClientesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ========================= Navegación / carga =========================
  async ir(baseUrl: string) {
    const url = `${baseUrl}/dashboard/clientes`;
    await this.page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  /** Espera a que la página esté cargada */
  async esperarCarga(timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs;
    // Esperar a que aparezcan elementos clave de la página
    const indicators = [
      this.page.locator('[data-testid*="client-info"]'),
      this.page.locator('text=/información.*cliente/i'),
      this.page.locator('.tabulator'),
    ];

    while (Date.now() < deadline) {
      for (const indicator of indicators) {
        if ((await indicator.count()) > 0) {
          try {
            if (await indicator.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
              return;
            }
          } catch {
            // continuar
          }
        }
      }
      await this.page.waitForTimeout(500);
    }
  }

  // ========================= Filtros =========================
  async setRangoFechas(desdeISO: string, hastaISO: string) {
    const opened = await this.abrirDatePopover();
    if (opened) {
      const okStart = await this._fillRangeSegments(0, desdeISO);
      const okEnd = await this._fillRangeSegments(1, hastaISO);
      await this._clickOkSiExiste();
      if (okStart && okEnd) return;
    }
    await this.setFechaDesde(desdeISO);
    await this.setFechaHasta(hastaISO);
  }

  async setFechaDesde(yyyy_mm_dd: string) {
    await this._setDateByLabel(/fecha.*(desde|inicio)/i, yyyy_mm_dd);
  }

  async setFechaHasta(yyyy_mm_dd: string) {
    await this._setDateByLabel(/fecha.*(hasta|fin)/i, yyyy_mm_dd);
  }

  async setNombreCliente(nombre: string) {
    // Buscar input o selector de cliente
    const clienteInput = this.page
      .getByLabel(/cliente|nombre.*cliente/i)
      .or(this.page.locator('input[placeholder*="cliente" i], input[name*="cliente" i]'))
      .first();

    if (await clienteInput.count()) {
      await clienteInput.fill(nombre);
      // Esperar a que aparezcan opciones y seleccionar
      const option = this.page.getByRole("option", { name: new RegExp(nombre, "i") }).first();
      if (await option.count()) {
        await option.click({ timeout: 10_000 }).catch(() => {});
      }
    }
  }

  async clickFiltrar() {
    const btn = this.page.getByRole("button", { name: /filtrar|buscar|aplicar/i }).first();
    if (await btn.count()) {
      await btn.click({ timeout: 30_000 }).catch(() => {});
    }
  }

  // ========================= Tarjetas de Información =========================
  
  /** Obtiene el texto de la tarjeta de información general */
  async getInfoGeneral(): Promise<string> {
    const card = this.page
      .locator('[data-testid*="client-info"], [data-testid*="info-general"]')
      .or(this.page.locator('text=/información.*general/i').locator('..').locator('..'))
      .first();
    if (await card.count()) {
      return (await card.innerText().catch(() => "")).trim();
    }
    return "";
  }

  /** Obtiene información de contacto (teléfono, email, dirección) */
  async getInfoContacto(): Promise<string> {
    const card = this.page
      .locator('[data-testid*="contact"], [data-testid*="contacto"]')
      .or(this.page.locator('text=/contacto/i').locator('..').locator('..'))
      .first();
    if (await card.count()) {
      return (await card.innerText().catch(() => "")).trim();
    }
    return "";
  }

  /** Obtiene las notas del cliente */
  async getNotas(): Promise<string> {
    const card = this.page
      .locator('[data-testid*="nota"], [data-testid*="note"]')
      .or(this.page.locator('text=/nota/i').locator('..').locator('..'))
      .first();
    if (await card.count()) {
      return (await card.innerText().catch(() => "")).trim();
    }
    return "";
  }

  /** Obtiene el valor de ventas totales */
  async getVentasTotales(): Promise<number> {
    const card = this.page
      .locator('text=/ventas.*total/i')
      .locator('..')
      .locator('strong, span, b, [class*="value"], [class*="amount"]')
      .first();
    if (await card.count()) {
      const txt = (await card.innerText().catch(() => "")).trim();
      return this._textoAMonedaSeguro(txt);
    }
    return 0;
  }

  /** Obtiene el período medio de pago (en días) */
  async getPeriodoMedioPago(): Promise<number> {
    const card = this.page
      .locator('text=/período.*medio|periodo.*pago|días.*promedio/i')
      .locator('..')
      .locator('strong, span, b, [class*="value"]')
      .first();
    if (await card.count()) {
      const txt = (await card.innerText().catch(() => "")).trim();
      // Extraer número de días
      const match = txt.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  }

  /** Obtiene el monto pendiente */
  async getMontoPendiente(): Promise<number> {
    const card = this.page
      .locator('text=/pendiente|saldo.*pendiente|monto.*pendiente/i')
      .locator('..')
      .locator('strong, span, b, [class*="value"], [class*="amount"]')
      .first();
    if (await card.count()) {
      const txt = (await card.innerText().catch(() => "")).trim();
      return this._textoAMonedaSeguro(txt);
    }
    return 0;
  }

  /** Obtiene información de morosidad */
  async getMorosidad(): Promise<string> {
    const card = this.page
      .locator('text=/morosidad|días.*vencido|vencimiento/i')
      .locator('..')
      .locator('..')
      .first();
    if (await card.count()) {
      return (await card.innerText().catch(() => "")).trim();
    }
    return "";
  }

  /** Obtiene la clasificación crediticia (Oro, Plata, Bronce, etc.) */
  async getClasificacionCrediticia(): Promise<string> {
    const card = this.page
      .locator('text=/clasificación.*credit|segmento|rating/i')
      .locator('..')
      .locator('strong, span, b, [class*="badge"], [class*="tag"]')
      .first();
    if (await card.count()) {
      return (await card.innerText().catch(() => "")).trim();
    }
    return "";
  }

  /** Obtiene el ticket promedio */
  async getTicketPromedio(): Promise<number> {
    const card = this.page
      .locator('text=/ticket.*promedio|promedio.*ticket/i')
      .locator('..')
      .locator('strong, span, b, [class*="value"]')
      .first();
    if (await card.count()) {
      const txt = (await card.innerText().catch(() => "")).trim();
      return this._textoAMonedaSeguro(txt);
    }
    return 0;
  }

  /** Obtiene la frecuencia de compra (en días) */
  async getFrecuenciaCompra(): Promise<number> {
    const card = this.page
      .locator('text=/frecuencia.*compra|frecuencia.*días/i')
      .locator('..')
      .locator('strong, span, b, [class*="value"]')
      .first();
    if (await card.count()) {
      const txt = (await card.innerText().catch(() => "")).trim();
      const match = txt.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
  }

  // ========================= Gráficos =========================
  
  /** Verifica que el gráfico de cartera crédito/contado esté visible */
  async graficoCarteraCreditoContado(): Locator {
    return this.page
      .locator('[data-testid*="cartera"], [data-testid*="credito-contado"]')
      .or(this.page.locator('text=/crédito.*contado|contado.*crédito/i').locator('..').locator('..'))
      .first();
  }

  /** Verifica que el gráfico de límite crediticio esté visible */
  async graficoLimiteCrediticio(): Locator {
    return this.page
      .locator('[data-testid*="limite-credito"], [data-testid*="credit-limit"]')
      .or(this.page.locator('text=/límite.*crédito|limite.*credito/i').locator('..').locator('..'))
      .first();
  }

  // ========================= Tablas =========================
  
  /** Obtiene la tabla de clasificación por volumen */
  async getTablaClasificacionVolumen(): Locator {
    return this.page
      .locator('[data-testid*="clasificacion-volumen"], [data-testid*="volume-classification"]')
      .or(this.page.locator('text=/clasificación.*volumen|volumen.*ventas/i').locator('..').locator('.tabulator'))
      .first();
  }

  /** Obtiene la tabla de recomendación de productos */
  async getTablaRecomendacionProductos(): Locator {
    return this.page
      .locator('[data-testid*="recomendacion"], [data-testid*="recommendation"]')
      .or(this.page.locator('text=/recomendación.*producto|producto.*recomendado/i').locator('..').locator('.tabulator'))
      .first();
  }

  /** Obtiene la tabla de estado de cuenta */
  async getTablaEstadoCuenta(): Locator {
    return this.page
      .locator('[data-testid*="estado-cuenta"], [data-testid*="account-statement"]')
      .or(this.page.locator('text=/estado.*cuenta|cuenta.*cliente/i').locator('..').locator('.tabulator'))
      .first();
  }

  /** Obtiene el número de filas de una tabla */
  async getFilasTabla(tabla: Locator): Promise<number> {
    return await tabla.locator(".tabulator-row").count();
  }

  // ========================= Helpers privados =========================
  
  private async abrirDatePopover(): Promise<boolean> {
    const chip = this.page.locator('[data-slot="input-field"]').first();
    if (await chip.count()) {
      await chip.click({ timeout: 10_000 }).catch(() => {});
    }

    if (!(await this._haySegmentosVisibles())) {
      const anyChip = this.page
        .locator('button:has(svg), div:has([class*="calendar"])')
        .first();
      if (await anyChip.count()) {
        await anyChip.click({ timeout: 10_000 }).catch(() => {});
      }
    }

    return await this._esperaSegmentos(5_000);
  }

  private async _haySegmentosVisibles(): Promise<boolean> {
    const seg = this.page.locator('[data-slot="segment"][role="spinbutton"]');
    if ((await seg.count()) === 0) return false;
    try {
      return await seg.first().isVisible();
    } catch {
      return false;
    }
  }

  private async _esperaSegmentos(timeout: number): Promise<boolean> {
    const seg = this.page.locator('[data-slot="segment"][role="spinbutton"]');
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if ((await seg.count()) > 0) {
        try {
          if (await seg.first().isVisible()) return true;
        } catch {
          // ignorar
        }
      }
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  private async _fillRangeSegments(index: number, iso: string): Promise<boolean> {
    const { y, m, d } = this._splitISO(iso);
    const segYear = this.page.locator('[data-type="year"][role="spinbutton"]').nth(index);
    const segMonth = this.page.locator('[data-type="month"][role="spinbutton"]').nth(index);
    const segDay = this.page.locator('[data-type="day"][role="spinbutton"]').nth(index);

    const exists =
      (await segYear.count()) > 0 && (await segMonth.count()) > 0 && (await segDay.count()) > 0;
    if (!exists) return false;

    const fill = async (seg: Locator, v: string) => {
      try {
        if (!(await seg.isVisible())) return;
        await seg.click();
        await seg.press("Control+A").catch(() => {});
        await seg.type(v, { delay: 15 });
      } catch {
        // ignorar
      }
    };

    await fill(segYear, y);
    await fill(segMonth, this._pad2(m));
    await fill(segDay, this._pad2(d));
    try {
      await segDay.press("Enter");
    } catch {
      // ignorar
    }
    return true;
  }

  private async _setDateByLabel(labelRe: RegExp, iso: string) {
    const input = this.page
      .getByLabel(labelRe)
      .locator('input[type="date"], input[type="text"], input')
      .first();

    if (await input.count()) {
      try {
        if (await input.isVisible()) {
          await input.click().catch(() => {});
          await input.fill("");
          await input.fill(iso);
          await input.press("Enter").catch(() => {});
          return;
        }
      } catch {
        // ignorar
      }
    }

    const haySeg = await this._esperaSegmentos(3_000);
    if (!haySeg) {
      const label = this.page.getByText(labelRe).first();
      if (await label.count()) {
        await label.click().catch(() => {});
        await this._esperaSegmentos(3_000);
      }
    }

    const isStart = /desde|inicio/i.test(labelRe.source);
    if (await this._haySegmentosVisibles()) {
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

  private _textoAMonedaSeguro(raw: string | null | undefined): number {
    if (!raw) return 0;
    let s = raw.toString().trim();
    if (!s) return 0;

    s = s.replace(/[^\d.,\-]/g, "");

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

