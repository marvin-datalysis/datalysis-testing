import { Page, expect } from '@playwright/test';

export interface Pedido {
  productoNombre: string;
  existencia: number;
  cantidadOriginal: number;
}

export class RequisicionPage {
  readonly page: Page;

  readonly botonEditar;
  readonly dateInput;
  readonly tabla;
  readonly filas;
  readonly botonSiguiente;
  readonly sucursal;

  constructor(page: Page) {
    this.page = page;

    this.botonEditar = page.getByRole('button', { name: 'Editar pedido' });
    this.dateInput = page.locator('input#fechaPedido');
    this.tabla = page.locator('#requisicion');
    this.filas = this.tabla.locator('.tabulator-row:not(.tabulator-calcs)');
    this.botonSiguiente = page.getByRole('button', { name: /siguiente|next|>/i });
    this.sucursal = page.locator('[data-slot="value"]').first();
  }

  async goto() {
    await this.page.goto(`${process.env.APP_URL}/es/pedidos`);
  }

  async esperarPantallaCargada() {
    await expect(this.botonEditar).toBeEnabled({ timeout: 25000 });
  }

  async obtenerFecha(): Promise<string> {
    const fecha = await this.dateInput.getAttribute('value');
    return fecha!;
  }

  async obtenerSucursal(): Promise<string> {
    return (await this.sucursal.innerText()).trim();
  }

  async obtenerPedidosDeTabla(): Promise<Pedido[]> {
    const pedidos: Pedido[] = [];

    do {
      await expect(this.filas.first()).toBeVisible();
      const totalFilas = await this.filas.count();

      for (let i = 0; i < totalFilas; i++) {
        const fila = this.filas.nth(i);

        const nombreProducto = (await fila
          .locator('.tabulator-cell[tabulator-field="producto"]')
          .innerText()).trim();

        const existencia = Number(
          (await fila
            .locator('.tabulator-cell[tabulator-field="existencia"]')
            .innerText()).trim()
        );

        const cantidadOriginal = Number(
          (await fila
            .locator('.tabulator-cell[tabulator-field="pedido"]')
            .innerText()).trim()
        );

        pedidos.push({
          productoNombre: nombreProducto,
          existencia,
          cantidadOriginal,
        });
      }

      if (await this.botonSiguiente.isVisible() && await this.botonSiguiente.isEnabled()) {
        await this.botonSiguiente.click();
        await this.page.waitForTimeout(500);
      } else {
        break;
      }

    } while (true);

    await this.page.mouse.wheel(0, -10000);
    return pedidos;
  }
}
