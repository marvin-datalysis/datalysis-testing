import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDBTransaccional } from '../../../utils/db';
import { convertirFecha } from '../../../utils/convertirFecha';

test.only('Validación de pedidos mostrados en el consolidado', async ({ page }) => {
  await test.setTimeout(60000);

  await page.goto(`${process.env.APP_URL}/es/consolidado-pedidos`);

  if (page.url().includes('sign-in')) {
    login(page,false);
    await page.waitForURL('**/consolidado-pedidos');
    await page.waitForTimeout(500);
  }

  const botonEditar = page.getByTitle('Editar')
  await expect(botonEditar).toBeEnabled({ timeout: 25000 });
  await page.waitForTimeout(2000);
  await expect(botonEditar).toBeEnabled({ timeout: 25000 });
  await page.waitForTimeout(1000);

  const dateInput = page.locator('input#fechaEntrega');
  const fecha = await dateInput.getAttribute('value');

  interface PedidoConsolidado {
    fechaEncargo: string;
    productoNombre: string;
    sucursalNombre: string;
    cantidadFinal: number;
  }

  const pedidosFront: PedidoConsolidado[] = [];

  const tabla = page.locator('.bom-bom-consolidado');
  await expect(tabla).toBeVisible();

  const filas = tabla.locator(
    '.tabulator-row:not(.tabulator-calcs)'
  );

  const botonSiguiente = page.locator(
    'button.tabulator-page[data-page="next"]'
  );
  let fechaActual = '';

  do {
    await expect(filas.first()).toBeVisible();

    const totalFilas = await filas.count();

    for (let i = 0; i < totalFilas; i++) {
      const fila = filas.nth(i);

      // SI ES FILA DE GRUPO → EXTRAER FECHA
      if (await fila.getAttribute('role') === 'rowgroup') {
        let textoFecha = (await fila.innerText()).trim();
        // "miércoles 03/dic/2025" -> 2025-12-03
        const match = textoFecha.match(/(\d{2})\/(\w{3})\/(\d{4})/);

        if (match) {

          const [_, dd, mmTxt, yyyy] = match;
          const meses: Record<string, string> = {
            ene: '01', feb: '02', mar: '03', abr: '04',
            may: '05', jun: '06', jul: '07', ago: '08',
            sep: '09', oct: '10', nov: '11', Dec: '12'
          };

          fechaActual = `${yyyy}-${meses[mmTxt]}-${dd}`;
        }

        continue;
      }

      // FILA NORMAL DE PRODUCTO
      const producto = (await fila
        .locator('[tabulator-field="producto"]')
        .innerText()).trim();

      // RECORRER TODAS LAS SUCURSALES (1 → 6)
      for (let sucursal = 1; sucursal <= 6; sucursal++) {

        const celdaSucursal = fila.locator(
          `[tabulator-field="${sucursal}"]`
        );

        await expect(celdaSucursal).toBeVisible();
        await celdaSucursal.scrollIntoViewIfNeeded();

        const nuevoValorSucursal = (await celdaSucursal.innerText()).trim();

        pedidosFront.push({
          fechaEncargo: fechaActual,
          productoNombre: producto,
          sucursalNombre: `Sucursal ${sucursal}`,
          cantidadFinal: Number(nuevoValorSucursal),
        });
      }
    }

    if (await botonSiguiente.isEnabled()) {
      await botonSiguiente.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
    
  } while (true);

  await page.mouse.wheel(0, -10000);

  const productosUnicos = [
    ...new Set(pedidosFront.map(p => p.productoNombre))
  ];

  const query = `
  select 
    p."fechaEncargo"::date::varchar as "fechaEncargo",
    pr."productoNombre",
    s."sucursalNombre",
    pp."cantidadFinal"
  from producto_pedido pp
  join pedido p on p."pedidoId" = pp."pedidoId"
  join sucursal s on s."sucursalId" = p."sucursalId"
  join producto pr on pr."productoCodigo" = pp."productoCodigo"
  where pp."fechaEntrega"::date = $1
    and pr."productoNombre" in (${productosUnicos.map((_, idx) => `$${idx + 2}`).join(',')})
  order by 1,2,3
`;

  const pedidosBD: PedidoConsolidado[] = await queryDBTransaccional(query, [
    convertirFecha(fecha!),
    ...productosUnicos.map(p => p),
  ],"pedidos_dummy");

  await expect(pedidosBD).toEqual(pedidosFront);
});
