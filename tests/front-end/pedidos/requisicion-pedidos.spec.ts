import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDB } from '../../../utils/db';

function getRandomIntInRange(min: number, max: number) {
  min = Math.ceil(min); // Ensure min is an integer
  max = Math.floor(max); // Ensure max is an integer
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function convertirFecha(fechaDDMMYYYY: string) {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

test.only('Editar todas las celdas de existencia y pedido en Tabulator', async ({ page }) => {
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
  await botonEditar.click();

  await page.waitForTimeout(500);

  const dateInput = page.locator('input#fechaPedido');
  const fecha = await dateInput.getAttribute('value');
  console.log(fecha)

  const valorSucursal = await page
    .locator('[data-slot="value"]')
    .first()
    .innerText();

  console.log('Sucursal seleccionada:', valorSucursal);

  // ✅ 1. Esperar a que la tabla cargue
  const tabla = page.locator('#requisicion');
  await expect(tabla).toBeVisible();


  // ✅ 2. Esperar a que existan filas
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

  // ✅ 3. Recorrer todas las filas
  for (let i = 0; i < totalFilas; i++) {
    const fila = filas.nth(i);

    // ============================
    // 📦 Obtener NOMBRE DEL PRODUCTO
    // ============================
    const celdaProducto = fila.locator(
      '.tabulator-cell[tabulator-field="producto"]'
    );

    const nombreProducto = (await celdaProducto.innerText()).trim();

    // ============================
    // ✏️ Editar EXISTENCIA
    // ============================
    const celdaExistencia = fila.locator(
      '.tabulator-cell[tabulator-field="existencia"]'
    );

    await celdaExistencia.scrollIntoViewIfNeeded();
    await celdaExistencia.dblclick();

    const inputExistencia = celdaExistencia.locator('input');
    const nuevoValorExistencia = getRandomIntInRange(1, 50);

    await inputExistencia.fill(nuevoValorExistencia.toString());
    await inputExistencia.press('Enter');

    await expect(celdaExistencia).toHaveText(
      nuevoValorExistencia.toString()
    );

    // ============================
    // ✏️ Editar PEDIDO (cantidad)
    // ============================
    const celdaPedido = fila.locator(
      '.tabulator-cell[tabulator-field="pedido"]'
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

    // ============================
    // ✅ GUARDAR EN EL ARREGLO
    // ============================
    pedidosFront.push({
      productoNombre: nombreProducto,
      existencia: nuevoValorExistencia,
      cantidadOriginal: nuevoValorPedido,
    });
  }

  await page.mouse.wheel(0, -10000);

  const botonGuardar = page.getByRole('button', { name: 'Guardar Cambios' });
  await expect(botonGuardar).toBeEnabled({ timeout: 15000 });
  await botonGuardar.click();

  await expect(botonEditar).toBeVisible();
  await page.waitForTimeout(500);

  const query = `select "productoNombre",existencia,"cantidadOriginal" from producto_pedido pp
  join pedido p on p."pedidoId"=pp."pedidoId"
  join sucursal s on s."sucursalId"=p."sucursalId"
  join producto pr on pr."productoCodigo"=pp."productoCodigo"
  where "fechaEncargo"=$1 and "sucursalNombre"=$2
  and "productoNombre" in (${pedidosFront.map((_, idx) => `$${idx + 3}`).join(',')})
  order by "productoNombre"`;

  const values = [
    convertirFecha(fecha!),
    valorSucursal,
    ...pedidosFront.map(r => r.productoNombre)
  ];

  const pedidosBD: Pedido[] = await queryDB(query, values);

  await expect(pedidosBD).toEqual(pedidosFront);
});
