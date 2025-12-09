import { test, expect } from '@playwright/test';
import { getAccessToken } from '../../../utils/getToken';
import { queryDBTransaccional } from '../../../utils/db';
import { getRandomIntInRange } from '../../../utils/getRandomIntInRange';
import { DataPedidosObtenidos } from './utils/DataPedidosObtenidosInterface';

test.describe('Guardar pedido - API + DB SIN POM', () => {

  test('Los pedidos de la requisición guardados por la api deben coincidir con los de la BD', async ({ request }) => {

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
        data: {sucursalId,fechaEncargo},
      }
    );
    const responseWithType:DataPedidosObtenidos= await response.json();
    const pedidos = responseWithType.data.pedidos.map(p=>({
        ...p,
        existencia: getRandomIntInRange(1,50),
        cantidadOriginal: getRandomIntInRange(1,50)
    }))

    // BODY DEL REQUEST
    const body = {
      data: {
        sucursalId: 1,
        fechaEncargo: fechaEncargo,
        pedidos
      }
    };

    body.data.pedidos.map(p=>console.log(p.productoCodigo,p.existencia,p.cantidadOriginal));

    response = await request.post(
      `${process.env.API_URL}/api/bom_bom/pedidos/pedido/save`,
      {
        headers: {
          accessToken,
          'Content-Type': 'application/json',
        },
        data: body,
      }
    );

    // VALIDAR RESPONSE API
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toBeTruthy();

    const productosCodigos = body.data.pedidos.map(p => p.productoCodigo);

    // QUERY CORRECTA
    const query = `
      select 
        p."sucursalId",
        p."fechaEncargo"::date::varchar as "fechaEncargo",
        pp."productoCodigo",
        pp."pedidoId",
        pp."fechaEntrega"::date::varchar as "fechaEntrega",
        pp."existencia",
        pp."cantidadOriginal"
      from producto_pedido pp
      join pedido p on p."pedidoId" = pp."pedidoId"
      where 
        p."sucursalId" = $1
        and p."fechaEncargo"::date = $2
        and pp."productoCodigo" in (${productosCodigos.map((_, idx) => `$${idx + 3}`).join(',')})
    `;

    const values = [sucursalId, fechaEncargo, ...productosCodigos];

    // EJECUTAR QUERY
    const dataBD: any[] = await queryDBTransaccional(query, values,"pedidos_dummy");

    // VALIDACIONES DE DB
    expect(dataBD.length).toBe(body.data.pedidos.length);

    for (const pedido of body.data.pedidos) {
      const row = dataBD.find(d => d.productoCodigo === pedido.productoCodigo);

      expect(row).toBeTruthy();

      expect(row.sucursalId).toBe(sucursalId);
      expect(row.fechaEncargo).toBe(fechaEncargo);
      expect(row.fechaEntrega).toBe(pedido.fechaEntrega);
      expect(row.existencia).toBe(pedido.existencia);
      expect(row.cantidadOriginal).toBe(pedido.cantidadOriginal);

      // VALIDACIÓN CLAVE: EL BACKEND DEBE HABER GENERADO EL ID
      expect(row.pedidoId).not.toBeNull();

      if(pedido.pedidoId !== null) {
        expect(row.pedidoId).toBe(pedido.pedidoId);
      }
    }

  });

});
