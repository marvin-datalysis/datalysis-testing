import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { queryDB } from '../../../utils/db';
import { text } from 'stream/consumers';

function getRandomIntInRange(min: number, max: number) {
  min = Math.ceil(min); // Ensure min is an integer
  max = Math.floor(max); // Ensure max is an integer
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function convertirFecha(fechaDDMMYYYY: string) {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

test.only('Editar todas las celdas de pedido en Tabulator', async ({ page }) => {
  await test.setTimeout(60000);

  await page.goto(`${process.env.APP_URL}/es//consolidado-pedidos`);

  if (page.url().includes('sign-in')) {
    login(page);
    await page.waitForURL('**/consolidado-pedidos');
    await page.waitForTimeout(500);
  }

  //const botonEditar = page.locator('button#editar-consolidado')
  const botonEditar = page.getByTitle('Editar')
  await expect(botonEditar).toBeEnabled({ timeout: 15000 });
  await page.waitForTimeout(2000);
  await expect(botonEditar).toBeEnabled({ timeout: 15000 });
  await botonEditar.click();
  await page.waitForTimeout(1000);

  const dateInput = page.locator('input#fechaEntrega');
  const fecha = await dateInput.getAttribute('value');
  console.log(fecha);





  interface PedidoConsolidado {
    fechaEncargo: string;     // 2025-12-03
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

      // ✅ SI ES FILA DE GRUPO → EXTRAER FECHA
      if (await fila.getAttribute('role') === 'rowgroup') {
        let textoFecha = (await fila.innerText()).trim();
        //textoFecha = textoFecha.split(' ')[1];
        // "miércoles 03/dic/2025" → 2025-12-03
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

      // ✅ FILA NORMAL DE PRODUCTO
      const producto = (await fila
        .locator('[tabulator-field="producto"]')
        .innerText()).trim();

      // ✅ RECORRER TODAS LAS SUCURSALES (1 → 6)
      for (let sucursal = 1; sucursal <= 6; sucursal++) {

        const celdaSucursal = fila.locator(
          `[tabulator-field="${sucursal}"]`
        );

        await expect(celdaSucursal).toBeVisible();
        await celdaSucursal.scrollIntoViewIfNeeded();
        await celdaSucursal.dblclick();

        const inputSucursal = celdaSucursal.locator('input');
        const nuevoValorSucursal = getRandomIntInRange(1, 50);

        await inputSucursal.fill(nuevoValorSucursal.toString());
        await inputSucursal.press('Enter');

        await expect(celdaSucursal).toHaveText(
          nuevoValorSucursal.toString()
        );

       pedidosFront.push({
            fechaEncargo: fechaActual,
            productoNombre: producto,
            sucursalNombre: `Sucursal ${sucursal}`,
            cantidadFinal: nuevoValorSucursal,
          });
      }
    }

    // ✅ SIGUIENTE PÁGINA
    if (await botonSiguiente.isEnabled()) {
      await botonSiguiente.click();
      //await page.waitForTimeout(600);
    } else {
      break;
    }

  } while (true);


  await page.mouse.wheel(0, -10000);

  const botonGuardar = page.getByTitle('Guardar');
  await expect(botonGuardar).toBeEnabled({ timeout: 15000 });
  await botonGuardar.click();

  await expect(botonEditar).toBeVisible();
  await page.waitForTimeout(500);

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

  const pedidosBD: PedidoConsolidado[] = await queryDB(query, [
     convertirFecha(fecha!),
    ...productosUnicos.map(p=>p),
  ]);

  console.log(pedidosFront.length,pedidosBD.length)

  for (let i=0;i<pedidosBD.length;i++){
    if(JSON.stringify(pedidosBD[i]) !== JSON.stringify(pedidosFront[i])){
      console.log(1,pedidosBD[i],pedidosFront[i])
    }
  }

  await expect(pedidosBD).toEqual(pedidosFront);

});
