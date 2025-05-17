import * as dotenv from 'dotenv';
import { InicioCardResponse } from './inicio.interface';
import { test, expect, Page, APIRequestContext } from '@playwright/test'
import { chromium } from '@playwright/test';
dotenv.config();

//USAR COOKIES DESDE JSON LOCAL
/*const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
    storageState: 'auth.json'
});
const page = await context.newPage();
await page.goto('http://localhost:3000/inicio')*/

//USAR SESION LOCAL
/*const userDataDir = '/home/marvin/.config/edge-playwright';
const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: '/usr/bin/microsoft-edge',
    headless: true,
});
const page2 = await context.newPage();*/

test.beforeEach(async ({ page }) => {
    await page.goto(`${process.env.APP_URL}`)
    await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input#email').fill(process.env.EMAIL ?? '')
    await page.locator('input#password').fill(process.env.PASSWORD ?? '')
    await page.locator('button#login').click()
})

test.describe('inicio', () => {
    test('semana-periodo anterior', async ({ page, request }) => {
        await testTarjetaInicio(page,request,'VENTAS');
        await testTarjetaInicio(page,request,'CLIENTES');
        await testTarjetaInicio(page,request,'MARGEN\\%');
    })
})

export const testTarjetaInicio=async (page:Page, request:APIRequestContext,title:string) => {
        console.log('probando tarjeta de: '+title);

        let queryId = '';
        let graficoId = '';
        switch (title) {
            case 'CLIENTES':
                graficoId = 'cantidad-clientes';
                queryId = '5'
                break;
            case 'VENTAS':
                graficoId = 'ventas';
                queryId = '6'
                break;
            case 'MARGEN\\%':
                graficoId = 'margen-porcentual';
                queryId = '7';
                break;
        }

        await page.locator(`div.apexchartscomparacion-${graficoId}`).waitFor({ state: 'visible', timeout: 35000 });
        const valorPeriodoAnteriorHTML: string = await page.locator(`span#${title}-periodo-anterior-monto`).innerHTML();
        const valorPeriodoActualHTML: string = await page.locator(`span#${title}-periodo-actual-monto`).innerHTML();
        const monedaPeriodoAnterior: string = await page.locator(`span#${title}-periodo-anterior-moneda`).innerHTML();
        const monedaPeriodoActual: string = await page.locator(`span#${title}-periodo-actual-moneda`).innerHTML();
        const valorComparativoHTML: string = await page.locator(`span#${title}-comparativo`).innerHTML();

        const accessToken = process.env.TOKEN ?? '';
        const response = await request.post(`${process.env.API_URL}/api/queries/exec/${queryId}`, {
            headers: {
                accessToken,
                'Content-Type': 'application/json'
            },
            data: { datePeriod: 'week', timeComparison: 'prior_period' },
        });

        const data: InicioCardResponse = await response.json();

        let valorPeriodoAnteriorApi = '';
        let valorPeriodoActualApi = '';

        switch (title) {
            case 'CLIENTES':
                valorPeriodoAnteriorApi = data.data.summary.firstPeriod.cantidadClientes;
                valorPeriodoActualApi = data.data.summary.secondPeriod.cantidadClientes;
                break;
            case 'VENTAS':
                valorPeriodoAnteriorApi = data.data.summary.firstPeriod.ventas;
                valorPeriodoActualApi = data.data.summary.secondPeriod.ventas;
                break;
            case 'MARGEN\\%':
                valorPeriodoAnteriorApi = data.data.summary.firstPeriod.margenPorcentual;
                valorPeriodoActualApi = data.data.summary.secondPeriod.margenPorcentual;
                break;
        }

        const valorComparativoApi = data.data.summary.difference;
        const monedaApi = data.data.moneda.simbolo;

        if (title !== 'MARGEN\\%') 
            await expect(valorPeriodoAnteriorHTML.replace(',', '')).toBe(valorPeriodoAnteriorApi);

        await expect(valorPeriodoActualHTML.replace(',', '')).toBe(valorPeriodoActualApi);
        if (title === 'VENTAS') {
            await expect(monedaPeriodoAnterior).toBe(monedaApi);
            await expect(monedaPeriodoActual).toBe(monedaApi);
        }

        if (valorComparativoApi > 0) {
            await expect(valorComparativoHTML).toBe(`+${valorComparativoApi} ${title!=='MARGEN\\%'?'%':''}`);
            const icono = page.locator(`.${title}-arrow-up-icon`);
            await expect(icono).toBeVisible();
        } else {
            await expect(valorComparativoHTML).toBe(`-${valorComparativoApi} ${title!=='MARGEN\\%'?'%':''}`);
            const icono = page.locator(`.${title}-arrow-down-icon`);
            await expect(icono).toBeVisible();
        }
    }

//await page.locator('button#periodo').click()
//await page.locator('li#date-period-month').click()
//await page.locator('div.apexchartscomparacion-ventas').waitFor({ state: 'visible', timeout: 60000 });
//await page.locator('button#comparacion').click()
//await page.locator('li#date-period-month').click()
