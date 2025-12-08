import { Page, expect } from '@playwright/test';

export interface Pedido {
  productoNombre: string;
  existencia: number;
  cantidadOriginal: number;
}

export class RequisicionPage {
  readonly page: Page;

  readonly botonEditar;
  readonly botonGuardar;
  readonly dateInput;
  readonly tabla;
  readonly filas;
  readonly botonSiguiente;
  readonly sucursal;

  constructor(page: Page) {
    this.page = page;

    this.botonEditar = page.getByRole('button', { name: 'Editar pedido' });
    this.botonGuardar = page.getByRole('button', { name: 'Guardar Cambios' });
    this.dateInput = page.locator('input#fechaPedido');
    this.tabla = page.locator('#requisicion');
    this.filas = this.tabla.locator('.tabulator-row:not(.tabulator-calcs)');
    this.botonSiguiente = page.getByRole('button', { name: /siguiente|next|>/i });
    this.sucursal = page.locator('[data-slot="value"]').first();
  }

  async goto() {
    await this.page.goto(`${process.env.APP_URL}/es/pedidos`);
  }

  async esperarBotonEditarHabilitado() {
    await expect(this.botonEditar).toBeEnabled({ timeout: 25000 });
  }

  async hacerClickEditar() {
    await this.botonEditar.click();
    await this.page.waitForTimeout(1000);
  }

  async guardarCambios() {
    await expect(this.botonGuardar).toBeEnabled({ timeout: 25000 });
    await this.botonGuardar.click();
    await expect(this.botonEditar).toBeVisible();
  }

  async obtenerFecha(): Promise<string> {
    const fecha = await this.dateInput.getAttribute('value');
    return fecha!;
  }

  async obtenerSucursal(): Promise<string> {
    return (await this.sucursal.innerText()).trim();
  }

  // ======================================================
  // ✅ EDICIÓN COMPLETA DE TABLA CON RANDOM
  // ======================================================
  async editarPedidosRandom(
    getRandomIntInRange: (min: number, max: number) => number
  ): Promise<Pedido[]> {
    const pedidos: Pedido[] = [];

    await expect(this.tabla).toBeVisible();
    await expect(this.filas.first()).toBeVisible();

    do {
      const totalFilas = await this.filas.count();

      for (let i = 0; i < totalFilas; i++) {
        const fila = this.filas.nth(i);

        const nombreProducto = (await fila
          .locator('.tabulator-cell[tabulator-field="producto"]')
          .innerText()).trim();

        // ========== EXISTENCIA ==========
        const celdaExistencia = fila.locator(
          '.tabulator-cell[tabulator-field="existencia"]'
        );

        const esEditable = await celdaExistencia.evaluate(el =>
          el.classList.contains('tabulator-editable')
        );

        if (!esEditable) continue;

        await celdaExistencia.scrollIntoViewIfNeeded();
        await celdaExistencia.dblclick();

        const inputExistencia = celdaExistencia.locator('input');
        const nuevoValorExistencia = getRandomIntInRange(1, 50);

        await inputExistencia.fill(nuevoValorExistencia.toString());
        await inputExistencia.press('Enter');

        await expect(celdaExistencia).toHaveText(
          nuevoValorExistencia.toString()
        );

        // ========== PEDIDO ==========
        const celdaPedido = fila.locator(
          '.tabulator-editable[tabulator-field="pedido"]'
        );

        await celdaPedido.scrollIntoViewIfNeeded();
        await celdaPedido.dblclick();

        const inputPedido = celdaPedido.locator('input');
        const nuevoValorPedido = getRandomIntInRange(1, 50);

        await inputPedido.fill(nuevoValorPedido.toString());
        await inputPedido.press('Enter');

        await expect(celdaPedido).toHaveText(
          nuevoValorPedido.toString()
        );

        pedidos.push({
          productoNombre: nombreProducto,
          existencia: nuevoValorExistencia,
          cantidadOriginal: nuevoValorPedido,
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
      } else {
        break;
      }

      await this.page.waitForTimeout(500);

    } while (true);

    await this.page.mouse.wheel(0, -10000);
    return pedidos;
  }

}

