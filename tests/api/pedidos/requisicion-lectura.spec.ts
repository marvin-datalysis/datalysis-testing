import { test, expect } from '@playwright/test';
import { getAccessToken } from '../../../utils/getToken';
import { queryDBTransaccional } from '../../../utils/db';
import { getNuevoPedidoQuery, getPedidoExistenteQuery } from './utils/getPedidosQueries';
import { DataPedidosObtenidos } from './utils/DataPedidosObtenidosInterface';

test.describe('Guardar pedido - API + DB SIN POM', () => {

  test('Debe guardar pedido correctamente y generar pedidoId cuando viene null', async ({ request }) => {

    const numeroDeSucursales=await queryDBTransaccional('select count(*) from sucursal',[]);
    //const sucursalId = getRandomIntInRange(1,Number(numeroDeSucursales[0].count));
    const sucursalId=1;
    const fechaEncargo = new Date().toISOString().split('T')[0];
    console.log('fecha de encargo: ',fechaEncargo);
    console.log('sucursal: ', sucursalId);

    // TOKEN
    const accessToken = await getAccessToken();

    let response = await request.post(
      `${process.env.API_URL}/api/bom_bom/pedidos/pedido`,
      {
        headers: {
          accessToken,
          'Content-Type': 'application/json',
        },
        data: { sucursalId, fechaEncargo },
      }
    );
    const body: DataPedidosObtenidos = await response.json();

    // VALIDAR RESPONSE API
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toBeTruthy();

    const productosCodigos = body.data.pedidos.map(p => p.productoCodigo);

    const query = body.data.pedidoId ? getPedidoExistenteQuery : getNuevoPedidoQuery;

    // EJECUTAR QUERY
    const dataBD: any[] = await queryDBTransaccional(query, [fechaEncargo, sucursalId]);

    // VALIDACIONES DE DB
    expect(dataBD.length).toBe(body.data.pedidos.length);

    for (const pedido of body.data.pedidos) {
      const row = dataBD.find(d => d.productoCodigo === pedido.productoCodigo);

      expect(row).toBeTruthy();

      expect(row.fechaEncargo).toBe(fechaEncargo);
      expect(row.fechaEntrega).toBe(pedido.fechaEntrega);
      expect(row.existencia).toBe(pedido.existencia);
      expect(row.cantidadOriginal).toBe(pedido.cantidadOriginal);
      expect(row.pedidoId).toBe(pedido.pedidoId);
    }

  });

});
