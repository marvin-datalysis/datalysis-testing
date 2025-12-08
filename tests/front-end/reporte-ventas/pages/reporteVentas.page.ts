import { Page, Locator, APIRequestContext, request, expect } from '@playwright/test';
import { getAccessToken } from '../../../../utils/getToken';

export type VentaDetalle = {
  idFactura: number;
  idCliente: string;
  nombreCliente: string;
  nombreProducto: string;
  idProducto: string;
  precio: number;
  costo: number;
  cantidad: number;
  fechaEmisionFactura: string;
  nombreEmpleado: string;
  numeroSucursal: string;
  categoriaProducto: string;
  condicionPago: string;
  margen: number;
  venta: number;
  descuento: number;
  porcentajeDescuento: number;
  segmentoCliente: string;
};

// ========================================
// CLIENTE API
// ========================================
export class ReporteVentasAPI {
  private api!: APIRequestContext;
  private baseUrl = process.env.API_URL || '';

  async init() {
    const token = await getAccessToken();

    this.api = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async dispose() {
    await this.api.dispose();
  }

  async obtenerDetalle(payload: any) {
    return this.api.post('/api/queries/exec/26', { data: payload });
  }

  columnasObligatorias(row: VentaDetalle) {
    const columnas = [
      'idFactura', 'idCliente', 'nombreCliente', 'nombreProducto', 'idProducto',
      'precio', 'costo', 'cantidad', 'fechaEmisionFactura', 'nombreEmpleado',
      'numeroSucursal', 'categoriaProducto', 'condicionPago', 'margen', 'venta',
      'descuento', 'porcentajeDescuento', 'segmentoCliente'
    ];
    return columnas.every(c => c in row);
  }
}

// ========================================
// PAGE OBJECT (GUI)
// ========================================
export class ReporteVentasPage {
  readonly page: Page;
  readonly loader: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loader = page.locator('.animacion-carga');
  }

  async ir() {
    await this.page.goto(`${process.env.APP_URL}/reportes/ventas`);
  }

  // ========================================
  // ESPERAR TABLA (versión corregida)
  // ========================================
  async esperarTabla() {
    // 1. Esperar que desaparezca el loader
    await this.loader.waitFor({ state: "detached", timeout: 60000 });

    // 2. Esperar que exista al menos una fila de Tabulator
    await expect(
      this.page.locator('.tabulator-row').first()
    ).toBeVisible({ timeout: 25000 });
  }

  // ========================================
  // LEER LOS DATOS DE LA TABLA (corregido)
  // ========================================
  async obtenerDatosNormalizados() {
    const filas = this.page.locator('.tabulator-row');
    const total = await filas.count();
    const resultado = [];

    for (let i = 0; i < total; i++) {
      const celdas = filas.nth(i).locator('.tabulator-cell');
      const count = await celdas.count();

      // Tabulator muestra totales/footer → ignorarlos
      if (count < 19) continue;

      const row = {
        fechaEmisionFactura: await celdas.nth(0).innerText(),
        idFactura: Number(await celdas.nth(1).innerText()),
        nombreEmpresa: await celdas.nth(2).innerText(),
        segmentoCliente: await celdas.nth(3).innerText(),
        idCliente: Number(await celdas.nth(4).innerText()),
        nombreCliente: await celdas.nth(5).innerText(),
        nombreProducto: await celdas.nth(6).innerText(),
        categoriaProducto: await celdas.nth(7).innerText(),
        condicionPago: await celdas.nth(8).innerText(),
        idProducto: Number(await celdas.nth(9).innerText()),
        precio: Number(await celdas.nth(10).innerText()),
        costo: Number(await celdas.nth(11).innerText()),
        cantidad: Number(await celdas.nth(12).innerText()),
        idEmpleado: Number(await celdas.nth(13).innerText()),
        nombreEmpleado: await celdas.nth(14).innerText(),
        descuento: Number((await celdas.nth(15).innerText()).replace("$", "")),
        porcentajeDescuento: Number((await celdas.nth(16).innerText()).replace("%", "")),
        margen: Number((await celdas.nth(17).innerText()).replace("$", "")),
        venta: Number((await celdas.nth(18).innerText()).replace("$", "").replace(",", "")),
      };

      resultado.push(row);
    }

    return resultado;
  }

  // Normalización de API
  normalizarBackend(rows: any[]) {
    return rows.map(r => this.normalizar(r));
  }

  private normalizar(row: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, this.toValue(v)])
    );
  }

  private toValue(v: string | number | undefined | null) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number(v.toFixed(1));

    const limpio = String(v).replace(/[$,%\s]/g, '').replace(/,/g, '');
    const num = Number(limpio);

    return isNaN(num) ? String(v).trim() : Number(num.toFixed(1));
  }

  // ===========================================
// Selección real del dropdown multiselect
// ===========================================
async seleccionarFiltroLista(label: string, valor: string) {

  // 1. Abrir el dropdown
  const trigger = this.page.locator(
    `div:has(> div:text-is("${label}")) button`
  );
  await trigger.click();

  const dropdown = this.page.locator('div[id^="dropdown-"]:visible');

  // 2. DESMARCAR TODO
  const selectAll = dropdown.getByText("Seleccionar todos", { exact: true });
  if (await selectAll.isVisible().catch(() => false)) {
    await selectAll.click();
    await this.page.waitForTimeout(200);
  }

  // 3. Escribir valor (y dejar que el componente lo seleccione solo)
  const buscador = dropdown.getByPlaceholder("Buscar");
  await buscador.fill(valor);
  await this.page.waitForTimeout(400);

  // 4. Confirmar (sin tocar los checkboxes)
  await dropdown.getByRole("button", { name: /^Ok$/ }).click();
}

async getValorSeleccionado(label: string): Promise<string> {
  // Ubica el contenedor del filtro
  const container = this.page.locator(
    `div:has(> div:text-is("${label}"))`
  );

  // Dentro de ese contenedor, el valor seleccionado aparece como un "chip"
  const chip = container.locator('.p-multiselect-label');

  const texto = (await chip.innerText()).trim();

  // El componente muestra:
  //   "Oscar Ortega"   cuando es 1 valor
  //   "2 seleccionados" cuando hay varios
  // Para nuestras pruebas, siempre es 1 valor.
  return texto;
}

async obtenerFiltrosActuales() {
  const spinners = this.page.getByRole("spinbutton");

  const getVal = async (i: number) =>
    (await spinners.nth(i).textContent())?.trim() ?? "";

  const fechaMin = `${await getVal(2)}-${await getVal(1)}-${await getVal(0)}`;
  const fechaMax = `${await getVal(5)}-${await getVal(4)}-${await getVal(3)}`;

  return {
    fechaMin,
    fechaMax,
    nombreCliente: await this.getValorSeleccionado("Cliente"),
    segmentoCliente: await this.getValorSeleccionado("Segmento"),
    empresa: await this.getValorSeleccionado("Empresa")
  };
}




}


