import { Page, Locator, expect } from '@playwright/test';

export class DashboardClientesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // =====================================================
  // Navegación
  // =====================================================
  async ir() {
    await this.page.goto(`${process.env.APP_URL}/dashboard/clientes`, {
      waitUntil: "domcontentloaded"
    });
  }

  async esperarCargaInicial() {
    await this.page.waitForSelector("text=Clientes", { timeout: 15000 });
  }

  // =====================================================
  // SELECTOR GENÉRICO PARA MULTISELECT PRIME-NG
  // =====================================================
  private botonFiltro(label: string): Locator {
    return this.page.locator(
      `div:has(> div:text-is("${label}")) button`
    );
  }

private panelFiltro(): Locator {
  // Panel real: contiene lista + buscador + botón Ok
  return this.page.locator("div:has(button:text-is('Ok'))").first();
}

async seleccionarFiltro(label: string, valor: string) {
  const boton = this.botonFiltro(label);

  await boton.waitFor({ state: "visible", timeout: 15000 });
  await boton.click();

  const panel = this.panelFiltro();

  // Esperar a que realmente se renderice
  await expect(panel).toBeVisible({ timeout: 15000 });

  // Seleccionar el valor
  //await panel.getByText(valor, { exact: true }).click();

  // Confirmar selección
  await panel.getByRole("button", { name: "Ok" }).click();
}


  // Alias específico para el caso de CP-69
  async seleccionarCliente(nombre: string) {
    return this.seleccionarFiltro("Cliente", nombre);
  }

  // =====================================================
  // TARJETAS DE CONTACTO — Lectura real del DOM
  // =====================================================
  contactoNombre(): Locator {
    return this.page
      .locator("span:text('Contacto')")
      .locator("xpath=following-sibling::div[1]");
  }

  contactoCargo(): Locator {
    return this.page
      .locator("span:text('Cargo')")
      .locator("xpath=following-sibling::div[1]");
  }

  contactoTelefono(): Locator {
    return this.page
      .locator("span:text('Teléfono')")
      .locator("xpath=following-sibling::div[1]");
  }

  async obtenerDatosContacto() {
    return {
      contacto: (await this.contactoNombre().innerText()).trim(),
      cargo: (await this.contactoCargo().innerText()).trim(),
      telefono: (await this.contactoTelefono().innerText()).trim(),
    };
  }

  // =====================================================
  // FECHA: Cliente Desde
  // =====================================================
  clienteDesde(): Locator {
    return this.page
      .locator("span:text('Cliente Desde')")
      .locator("xpath=following-sibling::span[1]");
  }

  async obtenerClienteDesde() {
    return (await this.clienteDesde().innerText()).trim();
  }


  notaTexto(): Locator {
  return this.page
    .locator("span:text('Notas')")
    .locator("xpath=following-sibling::div[1]//div");
}

async obtenerNotaCliente() {
  return (await this.notaTexto().innerText()).trim();
}


// =====================================================
// TARJETA: Ventas Totales
// =====================================================
ventasTotalesValor(): Locator {
  return this.page
    .locator("span:text('VENTAS TOTALES')")
    .locator("xpath=following-sibling::div[1]/span[2]");
}

async obtenerVentasTotales() {
  const texto = await this.ventasTotalesValor().innerText();
  // Remover comas y espacios
  return Number(texto.replace(/[^0-9.-]/g, ""));
}

async obtenerRangoFechas() {
  const spinners = this.page.getByRole("spinbutton");

  const getVal = async (i: number) =>
    (await spinners.nth(i).textContent())?.trim() ?? "";

  return {
    fechaMin: `${await getVal(2)}-${await getVal(1)}-${await getVal(0)}`,
    fechaMax: `${await getVal(5)}-${await getVal(4)}-${await getVal(3)}`
  };
}

// =====================================================
// TARJETA: PERÍODO MEDIO DE PAGO
// =====================================================
periodoMedioPagoValor(): Locator {
  return this.page
    .locator("span:text('PERÍODO MEDIO DE PAGO')")
    .locator("xpath=following-sibling::div[1]/span[1]");
}

async obtenerPeriodoMedioPago() {
  const texto = await this.periodoMedioPagoValor().innerText();
  return Number(texto.replace(/[^0-9.-]/g, ""));
}

montoPagoPendienteValor(): Locator {
  return this.page
    .locator("span:text('MONTO DE PAGO PENDIENTE')")
    .locator("xpath=following-sibling::div[1]/span[2]");
}

async obtenerMontoPagoPendiente() {
  const texto = await this.montoPagoPendienteValor().innerText();
  return Number(texto.replace(/[^0-9.-]/g, ""));
}

  // ================================
  // KPI: Morosidad (%)
  // ================================
  tasaMorosidadPorcentajeLocator() {
    return this.page
      .locator("span:text('TASA MOROSIDAD (%)')")
      .locator("xpath=following-sibling::div[1]/span[1]");
  }

  async obtenerTasaMorosidadPorcentaje() {
    const texto = await this.tasaMorosidadPorcentajeLocator().innerText();
    return Number(texto.replace(/[^0-9.-]/g, ""));
  }

  // ================================
  // KPI: Valor moroso ($)
  // ================================
  tasaMorosidadValorLocator() {
    return this.page
      .locator("span:text('VALOR MOROSO')")
      .locator("xpath=following-sibling::div[1]/span[2]");
  }

  async obtenerTasaMorosidadValor() {
    const raw = await this.tasaMorosidadValorLocator().innerText();
    return Number(raw.replace(/[^0-9]/g, ""));
  }



async aplicarFiltro() {
  await this.page.getByRole("button", { name: "Filtrar" }).click();
}

clasificacionCreditoValor() {
  return this.page.locator(
    "//span[contains(text(),'CLASIFICACIÓN DEL CLIENTE')]/following::span[contains(@class,'text-4xl')][1]"
  );
}

async obtenerClasificacionCredito() {
  const raw = await this.clasificacionCreditoValor().innerText();
  return raw.trim();
}

async obtenerCategoriaSeleccionada() {
  return (await this.page
    .locator("text=Productos recomendados")
    .locator("xpath=following::button[1]")
    .innerText()).trim();
}

tablaEstadoCuentaFilas(): Locator {
  return this.page.locator(".tabulator-row");
}

async esperarTablaEstadoCuenta(timeout = 60000) {
  const filas = this.tablaEstadoCuentaFilas();
  await expect(filas.first()).toBeVisible({ timeout });
}

async leerFilaTabulator(row: Locator) {
  return {
    idVenta: await row.locator('[tabulator-field="idVenta"]').innerText(),
    numeroSucursal: await row.locator('[tabulator-field="numeroSucursal"]').innerText(),
    nombreCliente: await row.locator('[tabulator-field="nombreCliente"]').innerText(),
    fechaVenta: await row.locator('[tabulator-field="fechaVenta"]').innerText(),
    fechaVencimiento: await row.locator('[tabulator-field="fechaVencimiento"]').innerText(),
    diasCredito: await row.locator('[tabulator-field="indicePlazoCredito"]').innerText(),
    diasVencidos: await row.locator('[tabulator-field="diasVencidos"]').innerText(),
    totalFactura: await row.locator('[tabulator-field="totalFactura"]').innerText(),
    totalAbonado: await row.locator('[tabulator-field="totalAbonado"]').innerText(),
    saldoPendiente: await row.locator('[tabulator-field="saldoPendiente"]').innerText(),
  };
}

async obtenerFilasEstadoCuentaPagina1() {
  const filas = this.tablaEstadoCuentaFilas();
  await expect(filas).toHaveCount(20); // página 1 siempre muestra 20
  const rows = await filas.all();

  const datos: any[] = [];
  for (const row of rows) {
    datos.push(await this.leerFilaTabulator(row));
  }
  return datos;
}

private normalizarNumero(valor: string): string {
  return valor.replace(/,/g, "").trim();
}

async obtenerFilasEstadoCuentaPagina1Normalizadas() {
  const filas = this.page.locator(".tabulator-row");
  const all = await filas.all();

  const resultado = [];

  for (const row of all) {
    resultado.push({
      idVenta: await row.locator('[tabulator-field="idVenta"]').innerText(),
      numeroSucursal: await row.locator('[tabulator-field="numeroSucursal"]').innerText(),
      nombreCliente: await row.locator('[tabulator-field="nombreCliente"]').innerText(),
      fechaVenta: await row.locator('[tabulator-field="fechaVenta"]').innerText(),
      fechaVencimiento: await row.locator('[tabulator-field="fechaVencimiento"]').innerText(),
      diasCredito: await row.locator('[tabulator-field="indicePlazoCredito"]').innerText(),
      diasVencidos: await row.locator('[tabulator-field="diasVencidos"]').innerText(),

      // Normalización numérica
      totalFactura: this.normalizarNumero(
        await row.locator('[tabulator-field="totalFactura"]').innerText()
      ),
      totalAbonado: this.normalizarNumero(
        await row.locator('[tabulator-field="totalAbonado"]').innerText()
      ),
      saldoPendiente: this.normalizarNumero(
        await row.locator('[tabulator-field="saldoPendiente"]').innerText()
      ),
    });
  }

  return resultado;
}







}
