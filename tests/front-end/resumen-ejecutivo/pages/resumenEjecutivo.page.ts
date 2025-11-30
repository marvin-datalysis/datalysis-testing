import { Page } from '@playwright/test';

/**
 * Page Object Model para el Dashboard Resumen Ejecutivo.
 * Cumple con los CP: CP-57, CP-14, CP-62, CP-63, CP-59/60/61.
 */
export class ResumenEjecutivoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  async ir() {
    await this.page.goto(`${process.env.APP_URL}/dashboard/resumen-ejecutivo`, {
      waitUntil: 'domcontentloaded',
    });
  }

  // ============================================================
  // LOADERS Y KPIs
  // ============================================================

  async esperarCarga() {
    const loader = this.page.locator('.animacion-carga');

    if (await loader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loader.waitFor({ state: 'detached', timeout: 120000 });
    }
  }

  async esperarKPIs() {
    await this.esperarCarga();

    const titulos = [
      'VENTAS TOTALES',
      'COSTOS TOTALES',
      'MARGEN TOTAL',
      'MARGEN %',
      'TICKET PROMEDIO',
      'TICKETS'
    ];

    for (const titulo of titulos) {
      await this.page.getByText(titulo, { exact: true }).waitFor({
        state: 'visible',
        timeout: 60000,
      });
    }

    await this.page.locator('span.text-4xl').first().waitFor({
      state: 'visible',
      timeout: 60000,
    });

    await this.page.waitForTimeout(300);
  }

  // ============================================================
  // TARJETAS KPI (CP-57 / CP-14)
  // ============================================================

  tarjeta(titulo: string) {
    const card = this.page
      .getByText(titulo, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"shadow-md")]');

    return {
      actual: card.locator('.flex-row span.text-4xl').last(),
      anterior: card.locator('.grid .text-2xl').first(),
      anio: card.locator('.grid .text-2xl').nth(1),
    };
  }

  // ============================================================
  // *** NUEVO — RANGO REAL PARA API (SOLUCIÓN AL ERROR CP-57) ***
  // ============================================================

  /**
   * Extrae las fechas tal como aparecen en el datepicker (dd/mm/yyyy)
   * y las convierte a ISO (yyyy-mm-dd) para la API.
   */
  async extraerRangoFecha() {
    const inicioRaw = await this.page
      .locator('(//input[@type="text"])[1]')
      .inputValue();

    const finRaw = await this.page
      .locator('(//input[@type="text"])[2]')
      .inputValue();

    function convertirAISO(fecha: string) {
      const [d, m, y] = fecha.split('/');
      return `${y}-${m}-${d}`;
    }

    return {
      fechaMin: convertirAISO(inicioRaw),
      fechaMax: convertirAISO(finRaw),
    };
  }

  /**
   * Wrapper final para enviar el rango ISO a la API desde los tests.
   */
  async getRangoFechasParaAPI() {
    return await this.extraerRangoFecha();
  }

  // ============================================================
  // CP-62 — Filtros combinados
  // ============================================================

  async setDatePicker(baseSelector: string, fecha: { d: string; m: string; y: string }) {
    const campos = this.page.locator(`${baseSelector}//div[@role="spinbutton"]`);
    await campos.nth(0).fill(fecha.d);
    await campos.nth(1).fill(fecha.m);
    await campos.nth(2).fill(fecha.y);
  }

  async seleccionarRangoFechas(desde: string, hasta: string) {
    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[1]', {
      d: desde.padStart(2, '0'),
      m: '11',
      y: '2025',
    });

    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[2]', {
      d: hasta.padStart(2, '0'),
      m: '11',
      y: '2025',
    });
  }

  async seleccionarFiltroLista(label: string, valor: string) {
    const trigger = this.page.locator(`div.flex:has(div.text-sm:has-text("${label}"))`);
    await trigger.click();

    const dropdown = this.page.locator('div[id^="dropdown-"]:visible');

    const buscador = dropdown.getByPlaceholder('Buscar');
    if (await buscador.isVisible().catch(() => false)) {
      await buscador.fill(valor);
    }

    await dropdown.getByText(valor, { exact: true }).click();
    await dropdown.getByRole('button', { name: /^Ok$/ }).click();
  }

  async aplicarFiltrosCompletos(filtros: {
    inicio?: string;
    fin?: string;
    empresa?: string;
    categoria?: string;
    producto?: string;
    segmento?: string;
    cliente?: string;
  }) {
    const valorAntes = await this.page.locator('span.text-4xl').first().innerText();

    if (filtros.inicio && filtros.fin) {
      await this.seleccionarRangoFechas(filtros.inicio, filtros.fin);
    }

    if (filtros.empresa) await this.seleccionarFiltroLista('Empresa', filtros.empresa);
    if (filtros.categoria) await this.seleccionarFiltroLista('Categoria', filtros.categoria);
    if (filtros.producto) await this.seleccionarFiltroLista('Producto', filtros.producto);
    if (filtros.segmento) await this.seleccionarFiltroLista('Segmento', filtros.segmento);
    if (filtros.cliente) await this.seleccionarFiltroLista('Cliente', filtros.cliente);

    await this.page.getByRole('button', { name: 'Filtrar' }).click();

    await this.page.waitForFunction(
      (oldValue) => {
        const spans = [...document.querySelectorAll('span.text-4xl')];
        return spans.some((s) => s.textContent.trim() !== oldValue.trim());
      },
      valorAntes,
      { timeout: 60000 }
    );
  }

  async limpiarFiltros() {
    await this.page.getByRole('button', { name: 'Limpiar' }).click();
  }

  // ============================================================
  // CP-63 — Filtros secundarios
  // ============================================================

  async seleccionarDropdownSimplePorId(dropdownId: string, nuevoValor: string) {
    const button = this.page.locator(`div.relative:has(#${dropdownId}) >> button`);
    await button.click();

    const dropdown = this.page.locator(`#${dropdownId}`);
    await dropdown.getByText(nuevoValor, { exact: true }).click();
  }

  async seleccionarVistaTabla(vista: string) {
    const button = this.page.locator(`div.relative:has(#summary-table-selector-dropdown) >> button`);
    await button.click();

    const dropdown = this.page.locator('#summary-table-selector-dropdown');
    await dropdown.getByText(vista, { exact: true }).click();
  }

  // ============================================================
  // CP-62 — Filtro por periodo
  // ============================================================

  async seleccionarPeriodo(periodo: 'Día' | 'Semana' | 'Mes' | 'Trimestre' | 'Año') {
    const botonPeriodo = this.page
      .locator(`#grafico-ventas-dropdown-dropdown`)
      .locator('xpath=preceding-sibling::button[1]');

    await botonPeriodo.click();

    await this.page
      .locator(`#grafico-ventas-dropdown-dropdown li`, {
        hasText: new RegExp(`^${periodo}$`),
      })
      .first()
      .click();

    const valorAntes = await this.page.locator('span.text-4xl').first().innerText();

    await this.page.waitForFunction(
      (old) => {
        const spans = [...document.querySelectorAll('span.text-4xl')];
        return spans.some((s) => s.textContent.trim() !== old.trim());
      },
      valorAntes,
      { timeout: 60000 }
    );
  }

  // ============================================================
  // CP-62 — Validación de fecha inválida
  // ============================================================

  async datePickerEsInvalido(index: number) {
    const cont = this.page.locator(`(//div[@data-slot="input-wrapper"])[${index}]`);

    if (await cont.locator('[aria-invalid="true"]').isVisible().catch(() => false)) return true;

    if (await cont.locator('.text-red-500, .border-red-500').isVisible().catch(() => false))
      return true;

    if (await this.page.locator('text=/fecha inválida|fecha incorrecta/i').isVisible().catch(() => false))
      return true;

    return false;
  }

  // ============================================================
  // CP-59 / CP-60 / CP-61 — Validación API gráfico
  // ============================================================

  async capturarUltimaPeticionExec() {
    return await this.page.waitForResponse(
      (res) =>
        /exec|chart|grafico|time|series/i.test(res.url()) && res.request().method() === 'POST'
    );
  }

  async validarEsquemaChart(response: any) {
    const json = await response.json();
    const chart = json?.data?.chart;

    if (!chart) return false;

    return (
      Array.isArray(chart.labels) &&
      Array.isArray(chart.datasets) &&
      chart.datasets.length > 0 &&
      Array.isArray(chart.datasets[0].data)
    );
  }

  // ============================================================
  // Estabilidad general
  // ============================================================

  async validarRenderBasico() {
    await this.page.locator('span.text-4xl').first().waitFor({ timeout: 60000 });

    const elementos = [
      'VENTAS TOTALES',
      'COSTOS TOTALES',
      'MARGEN TOTAL',
      'MARGEN %',
      'TICKET PROMEDIO',
      'TICKETS'
    ];

    for (const el of elementos) {
      await this.page.getByText(el, { exact: true }).waitFor({ timeout: 60000 });
    }
  }
}
