import { Page } from '@playwright/test';

/**
 * Page Object Model para el Dashboard “Resumen Ejecutivo”.
 * Incluye únicamente los métodos requeridos por los CP documentados oficialmente:
 *  - CP-57 / CP-14: tarjetas KPI y validación contra API
 *  - CP-62: filtros combinados, rango de fechas y filtros por periodo
 *  - CP-63: filtros secundarios (Top Clientes, Top Productos, Vista de Tabla)
 *  - CP-59 / CP-60 / CP-61: validación de estructura de gráficos
 */
export class ResumenEjecutivoPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navega al dashboard.
   * Base de todos los CP que requieren cargar la vista.
   */
  async ir() {
    await this.page.goto(`${process.env.APP_URL}/dashboard/resumen-ejecutivo`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /**
   * Espera a que desaparezca el loader global.
   * Aplicado antes de leer cualquier KPI.
   */
  async esperarCarga() {
    const loader = this.page.locator('.animacion-carga');

    if (await loader.isVisible({ timeout: 2000 })) {
      await loader.waitFor({ state: 'detached', timeout: 120000 });
    }
  }

  /**
   * Espera a que todos los KPIs iniciales estén visibles.
   * CP-57
   */
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
        timeout: 60000
      });
    }

    await this.page.locator('span.text-4xl').first().waitFor({
      state: 'visible',
      timeout: 60000
    });

    await this.page.waitForTimeout(300);
  }

  /**
   * Devuelve los selectores de una tarjeta KPI según su título.
   * CP-57 / CP-14
   */
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
  // CP-62 — Gestión de filtros combinados
  // ============================================================

  /**
   * Rellena un DatePicker basado en su estructura HTML real.
   */
  async setDatePicker(baseSelector: string, fecha: { d: string, m: string, y: string }) {
    const campos = this.page.locator(`${baseSelector}//div[@role="spinbutton"]`);
    await campos.nth(0).fill(fecha.d);
    await campos.nth(1).fill(fecha.m);
    await campos.nth(2).fill(fecha.y);
  }

  /**
   * Establece un rango completo de fechas (inicio y fin).
   * CP-62
   */
  async seleccionarRangoFechas(desde: string, hasta: string) {
    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[1]', {
      d: desde.padStart(2, "0"),
      m: "11",
      y: "2025"
    });

    await this.setDatePicker('(//div[@data-slot="input-wrapper"])[2]', {
      d: hasta.padStart(2, "0"),
      m: "11",
      y: "2025"
    });
  }

  /**
   * Selecciona un valor dentro de un dropdown con buscador (Empresa, Producto, etc.).
   * CP-62
   */
  async seleccionarFiltroLista(label: string, valor: string) {
    const trigger = this.page.locator(`div.flex:has(div.text-sm:has-text("${label}"))`);
    await trigger.click();

    const dropdown = this.page.locator('div[id^="dropdown-"]:visible');

    const buscador = dropdown.getByPlaceholder('Buscar');
    if (await buscador.isVisible()) await buscador.fill(valor);

    await dropdown.getByText(valor, { exact: true }).click();
    await dropdown.getByRole('button', { name: /^Ok$/ }).click();
  }

  /**
   * Aplica todos los filtros disponibles.
   * CP-62
   */
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

    if (filtros.inicio && filtros.fin)
      await this.seleccionarRangoFechas(filtros.inicio, filtros.fin);

    if (filtros.empresa)
      await this.seleccionarFiltroLista("Empresa", filtros.empresa);

    if (filtros.categoria)
      await this.seleccionarFiltroLista("Categoria", filtros.categoria);

    if (filtros.producto)
      await this.seleccionarFiltroLista("Producto", filtros.producto);

    if (filtros.segmento)
      await this.seleccionarFiltroLista("Segmento", filtros.segmento);

    if (filtros.cliente)
      await this.seleccionarFiltroLista("Cliente", filtros.cliente);

    await this.page.getByRole('button', { name: 'Filtrar' }).click();

    await this.page.waitForFunction(
      (oldValue) => {
        const spans = [...document.querySelectorAll('span.text-4xl')];
        return spans.some(s => s.textContent.trim() !== oldValue.trim());
      },
      valorAntes,
      { timeout: 60000 }
    );
  }

  /**
   * Limpia todos los filtros aplicados.
   * CP-62
   */
  async limpiarFiltros() {
    await this.page.getByRole('button', { name: 'Limpiar' }).click();
  }

  // ============================================================
  // CP-63 — Filtros secundarios
  // ============================================================

  /**
   * Selecciona una opción simple dentro de un dropdown por ID.
   * CP-63
   */
  async seleccionarDropdownSimplePorId(dropdownId: string, nuevoValor: string) {
    const button = this.page.locator(`div.relative:has(#${dropdownId}) >> button`);
    await button.click();

    const dropdown = this.page.locator(`#${dropdownId}`);
    await dropdown.getByText(nuevoValor, { exact: true }).click();
  }

  /**
   * Selecciona la vista de tabla (Categoria, Producto, Cliente).
   * CP-63
   */
  async seleccionarVistaTabla(vista: string) {
    const button = this.page.locator(`div.relative:has(#summary-table-selector-dropdown) >> button`);
    await button.click();

    const dropdown = this.page.locator('#summary-table-selector-dropdown');
    await dropdown.getByText(vista, { exact: true }).click();
  }

  // ============================================================
  // CP-62 — Filtro de periodo (día, semana, mes, trimestre, año)
  // ============================================================

  async seleccionarPeriodo(periodo: 'Día' | 'Semana' | 'Mes' | 'Trimestre' | 'Año') {
    const botonPeriodo = this.page
      .locator(`#grafico-ventas-dropdown-dropdown`)
      .locator('xpath=preceding-sibling::button[1]');

    await botonPeriodo.click();

    await this.page
      .locator(`#grafico-ventas-dropdown-dropdown li`, {
        hasText: new RegExp(`^${periodo}$`)
      })
      .first()
      .click();

    const valorAntes = await this.page.locator('span.text-4xl').first().innerText();

    await this.page.waitForFunction(
      (old) => {
        const spans = [...document.querySelectorAll('span.text-4xl')];
        return spans.some(s => s.textContent.trim() !== old.trim());
      },
      valorAntes,
      { timeout: 60000 }
    );
  }

  // ============================================================
  // Validación de fecha inválida (parte del CP-62)
  // ============================================================

  async datePickerEsInvalido(index: number) {
    const contenedor = this.page.locator(`(//div[@data-slot="input-wrapper"])[${index}]`);

    // Intento 1: atributo aria-invalid
    if (await contenedor.locator('[aria-invalid="true"]').isVisible().catch(() => false)) {
      return true;
    }

    // Intento 2: clases de error conocidas
    if (await contenedor.locator('.text-red-500, .border-red-500').isVisible().catch(() => false)) {
      return true;
    }

    // Intento 3: texto de error cercano
    if (await this.page.locator('text=/fecha inválida|fecha incorrecta/i').isVisible().catch(() => false)) {
      return true;
    }

    return false;
  }


  // ============================================================
  // CP-59 / CP-60 / CP-61 — API del gráfico
  // ============================================================

  /**
   * Captura la petición del gráfico para validar estructura.
   * Aplicado en CP-59, CP-60 y CP-61 según tu documento.
   */
    async capturarUltimaPeticionExec() {
      return await this.page.waitForResponse(res =>
        /exec|chart|grafico|time|series/i.test(res.url()) &&
        res.request().method() === 'POST'
      );
    }



  /**
   * Valida el esquema mínimo del JSON devuelto por la API del gráfico.
   * CP-59 / CP-60 / CP-61
   */
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
  // Render mínimo del dashboard (usado en pruebas de estabilidad)
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
