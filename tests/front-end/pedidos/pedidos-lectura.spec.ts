import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDB } from '../../../utils/db';

function convertirFecha(fechaDDMMYYYY: string) {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

test.only('Validar datos solo lectura en Tabulator vs BD', async ({ page }) => {
  await test.setTimeout(60000);

  await page.goto('/es/pedidos');

  if (page.url().includes('sign-in')) {
    login(page);
    await page.waitForURL('**/pedidos');
    await page.waitForTimeout(500);
  }

  const botonEditar = page.getByRole('button', { name: 'Editar pedido' });
  await expect(botonEditar).toBeEnabled({ timeout: 15000 });
  await page.waitForTimeout(500);
  //await botonEditar.click();

  await page.waitForTimeout(500);

  const dateInput = page.locator('input#fechaPedido');
  const fecha = await dateInput.getAttribute('value');
  console.log('Fecha:', fecha);

  const valorSucursal = await page
    .locator('[data-slot="value"]')
    .first()
    .innerText();

  console.log('Sucursal seleccionada:', valorSucursal);

  // ✅ Esperar tabla
  const tabla = page.locator('#requisicion');
  await expect(tabla).toBeVisible();

  const filas = tabla.locator('.tabulator-row:not(.tabulator-calcs)');
  await expect(filas.first()).toBeVisible();

  const totalFilas = await filas.count();
  console.log(`Filas detectadas: ${totalFilas}`);

  interface Pedido {
    productoNombre: string;
    existencia: number;
    cantidadOriginal: number;
  }

  const pedidosFront: Pedido[] = [];

  // ✅ SOLO LECTURA
  for (let i = 0; i < totalFilas; i++) {
    const fila = filas.nth(i);

    // 📦 Producto
    const celdaProducto = fila.locator(
      '.tabulator-cell[tabulator-field="producto"]'
    );
    const nombreProducto = (await celdaProducto.innerText()).trim();

    // 📊 Existencia
    const celdaExistencia = fila.locator(
      '.tabulator-cell[tabulator-field="existencia"]'
    );
    const existenciaTexto = (await celdaExistencia.innerText()).trim();
    const existencia = Number(existenciaTexto);

    // 📦 Pedido (cantidad)
    const celdaPedido = fila.locator(
      '.tabulator-cell[tabulator-field="pedido"]'
    );
    const pedidoTexto = (await celdaPedido.innerText()).trim();
    const cantidadOriginal = Number(pedidoTexto);

    pedidosFront.push({
      productoNombre: nombreProducto,
      existencia,
      cantidadOriginal,
    });
  }

  // ✅ CONSULTA A BD
  const query = `
    select "productoNombre", existencia, "cantidadOriginal"
    from producto_pedido pp
    join pedido p on p."pedidoId" = pp."pedidoId"
    join sucursal s on s."sucursalId" = p."sucursalId"
    join producto pr on pr."productoCodigo" = pp."productoCodigo"
    where "fechaEncargo" = $1 
      and "sucursalNombre" = $2
      and "productoNombre" in (${pedidosFront.map((_, idx) => `$${idx + 3}`).join(',')})
    order by "productoNombre"
  `;

  const values = [
    convertirFecha(fecha!),
    valorSucursal,
    ...pedidosFront.map(r => r.productoNombre),
  ];

  const pedidosBD: Pedido[] = await queryDB(query, values);

  // ✅ VALIDACIÓN FINAL
  await expect(pedidosBD).toEqual(pedidosFront);
});
