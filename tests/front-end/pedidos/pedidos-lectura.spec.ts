import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDBTransaccional } from '../../../utils/db';
import { Pedido, RequisicionPage } from './pages/requisicionPage';
import { convertirFecha } from '../../../utils/convertirFecha';

test.only('Validar datos solo lectura en Tabulator vs BD (POM)', async ({ page }) => {
  const pedidosPage = new RequisicionPage(page);

  await test.setTimeout(60000);
  await pedidosPage.goto();

  if (page.url().includes('sign-in')) {
    await login(page,false);
    await page.waitForURL('**/pedidos');
  }

  await pedidosPage.esperarBotonEditarHabilitado();
  await page.waitForTimeout(2000);
  await pedidosPage.esperarBotonEditarHabilitado();

  const fecha = await pedidosPage.obtenerFecha();
  const valorSucursal = await pedidosPage.obtenerSucursal();
  const pedidosFront = await pedidosPage.obtenerPedidosDeTabla();

  // ============================
  // CONSULTA A BASE DE DATOS
  // ============================
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
    convertirFecha(fecha),
    valorSucursal,
    ...pedidosFront.map(r => r.productoNombre),
  ];

  const pedidosBD: Pedido[] = await queryDBTransaccional(query, values,"pedidos_dummy");

  // ============================
  // VALIDACIÓN FINAL
  // ============================
  await expect(pedidosBD).toEqual(pedidosFront);
});
