import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDB } from '../../../utils/db';
import { Pedido, RequisicionPage } from './pages/requisicionPage';
import { getRandomIntInRange } from '../../../utils/getRandomIntInRange';
import { convertirFecha } from '../../../utils/convertirFecha';

test('Editar todas las celdas de existencia y pedido en Tabulator (POM)', async ({ page }) => {
  const requisicionPage = new RequisicionPage(page);
  await test.setTimeout(60000);

  await requisicionPage.goto();

  if (page.url().includes('sign-in')) {
    await login(page,false);
    await page.waitForURL('**/pedidos');
  }

  await requisicionPage.esperarBotonEditarHabilitado();
  await page.waitForTimeout(2000);
  await requisicionPage.esperarBotonEditarHabilitado();
  await requisicionPage.hacerClickEditar();

  const fecha = await requisicionPage.obtenerFecha();
  const valorSucursal = await requisicionPage.obtenerSucursal();

  const pedidosFront = await requisicionPage.editarPedidosRandom(
    getRandomIntInRange
  );

  await requisicionPage.guardarCambios();

  // ============================
  // ✅ VALIDACIÓN CONTRA BD
  // ============================
  const query = `
    select "productoNombre", existencia, "cantidadOriginal"
    from producto_pedido pp
    join pedido p on p."pedidoId" = pp."pedidoId"
    join sucursal s on s."sucursalId" = p."sucursalId"
    join producto pr on pr."productoCodigo" = pp."productoCodigo"
    where "fechaEncargo" = $1 and "sucursalNombre" = $2
      and "productoNombre" in (${pedidosFront.map((_, idx) => `$${idx + 3}`).join(',')})
    order by "productoNombre"
  `;

  const values = [
    convertirFecha(fecha),
    valorSucursal,
    ...pedidosFront.map(r => r.productoNombre),
  ];

  const pedidosBD: Pedido[] = await queryDB(query, values);

  await expect(pedidosBD).toEqual(pedidosFront);
});