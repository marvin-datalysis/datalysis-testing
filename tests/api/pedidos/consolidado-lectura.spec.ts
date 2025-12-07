import { test, expect } from '@playwright/test';
import { getAccessToken } from '../../../utils/getToken';
import { queryDB } from '../../../utils/db';
import { getRandomIntInRange } from '../../../utils/getRandomIntInRange';
import { DataPedidosObtenidos } from './utils/DataPedidosObtenidosInterface';

test.describe('Guardar pedido - API + DB SIN POM', () => {

  test.only('Debe guardar pedido correctamente y generar pedidoId cuando viene null', async ({ request }) => {

    const fechaEntrega = '2025-12-10';

    // TOKEN
    const accessToken = await getAccessToken();

    let response = await request.post(
      `${process.env.API_URL}/api/bom_bom/pedidos/consolidado`,
      {
        headers: {
          accessToken,
          'Content-Type': 'application/json',
        },
        data: {fechaEntrega},
      }
    );
    const responseWithType:DataPedidosObtenidos= await response.json();
    const pedidos=responseWithType.data.pedidos;

    const productosCodigos = pedidos.map(p => p.productoCodigo);

    // QUERY CORRECTA
    const query = `
      select 
        p."sucursalId",
        p."fechaEncargo"::date::varchar as "fechaEncargo",
        pp."productoCodigo",
        pp."pedidoId",
        pp."fechaEntrega"::date::varchar as "fechaEntrega",
        pp."existencia",
        pp."cantidadOriginal",
        pp."cantidadFinal"
      from producto_pedido pp
      join pedido p on p."pedidoId" = pp."pedidoId"
      where 
        "fechaEntrega"::date = $1
        and pp."productoCodigo" in (${productosCodigos.map((_, idx) => `$${idx + 2}`).join(',')})
    `;

    const values = [fechaEntrega, ...productosCodigos];

    // EJECUTAR QUERY
    const dataBD: any[] = await queryDB(query, values);

    // VALIDACIONES DE DB
    expect(dataBD.length).toBe(pedidos.length);

    for (const pedido of pedidos) {
      const rowBD = dataBD.find(d => (d.fechaEncargo === pedido.fechaEncargo) && (d.sucursalId === pedido.sucursalId) && (d.productoCodigo === pedido.productoCodigo));

      expect(rowBD).toBeTruthy();

      expect(rowBD.sucursalId).toBe(pedido.sucursalId);
      expect(rowBD.fechaEncargo).toBe(pedido.fechaEncargo);
      expect(rowBD.fechaEntrega).toBe(pedido.fechaEntrega);
      expect(rowBD.existencia).toBe(pedido.existencia);
      expect(rowBD.cantidadOriginal).toBe(pedido.cantidadOriginal);
      expect(rowBD.cantidadFinal).toBe(pedido.cantidadFinal);

      // VALIDACIÓN CLAVE: EL BACKEND DEBE HABER GENERADO EL ID
      expect(rowBD.pedidoId).not.toBeNull();

      if(pedido.pedidoId !== null) {
        expect(rowBD.pedidoId).toBe(pedido.pedidoId);
      }
    }

  });

});
