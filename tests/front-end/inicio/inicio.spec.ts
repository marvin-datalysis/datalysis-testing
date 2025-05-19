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

test.beforeEach(async ({ /*page */ }) => {
    /*const page = await getLocalPageObject();
    await page.goto(`${process.env.APP_URL}`)
    await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input#email').fill(process.env.EMAIL ?? '')
    await page.locator('input#password').fill(process.env.PASSWORD ?? '')
    await page.locator('button#login').click()*/
})

test.describe('inicio', () => {
    test('semana-periodo anterior', async ({ /**page ,*/ request }) => {
        test.setTimeout(75000)
        const userDataDir = './context/chromium';
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
        });
        const page = await context.newPage();
        await page.goto(`${process.env.APP_URL}`);

        const botonPeriodo = await page.locator('button#periodo');
        await expect(botonPeriodo).toBeEnabled();
        await page.waitForTimeout(500);

        //week-prior_period
        /*await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'week', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'week', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'week', timeComparison: 'prior_period' });
*/
        //month-prior_period
        //await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'month', timeComparison: 'prior_period' });
        /*await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'month', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'month', timeComparison: 'prior_period' });
*/
        //quarter-prior_period
        //await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'quarter', timeComparison: 'prior_period' });
        //await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'quarter', timeComparison: 'prior_period' });
        //await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'quarter', timeComparison: 'prior_period' });

        //year-prior_period
        /*await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'year', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'year', timeComparison: 'prior_period' });
        */await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'year', timeComparison: 'prior_period' });

        //week-same_period_last_year
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'week', timeComparison: 'same_period_last_year',waitGraficoMargen:true });
        /*await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'week', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'week', timeComparison: 'same_period_last_year' });
*/
        //month-same_period_last_year
        //await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'month', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'month', timeComparison: 'same_period_last_year' });
        //await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'month', timeComparison: 'same_period_last_year' });

        //month-same_period_last_year
        //await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });
        //await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });
    })
})

const actualizarDropdowns = async ({ page, datePeriod, timeComparison,dropdownAUsar }: { page: Page, datePeriod: string, timeComparison: string,dropdownAUsar:string }) => {
    if (dropdownAUsar==='datePeriod') {
        await page.locator('button#periodo').click()
        await page.locator(`li#date-period-${datePeriod}`).click()
    }
    if (dropdownAUsar==='same_period_last_year' && datePeriod !== 'year') {
        await page.locator('button#comparacion').click()
        await page.locator(`li#time-comparison-${timeComparison}`).click()
    }
}

export const testTarjetaInicio = async (
    { page, request, title, datePeriod, timeComparison,waitGraficoMargen=false }:
        { page: Page, request: APIRequestContext, title: string, datePeriod: string, timeComparison: string,waitGraficoMargen?:boolean }
) => {
    console.log(`Probando. Tarjeta: ${title}, datePeriod: ${datePeriod}, timeComparison: ${timeComparison}`);

    const botonPeriodo = await page.locator('button#periodo');
    await expect(botonPeriodo).toBeEnabled();
    await page.waitForTimeout(500);
    await page.locator('button#periodo').click()
    await page.locator(`li#date-period-${datePeriod}`).click()
    if (datePeriod !== 'year') {
        if(waitGraficoMargen){
            await page.locator(`div.apexchartscomparacion-margen-porcentual`).waitFor({ state: 'visible', timeout: 75000 });
        }
        await page.locator('button#comparacion').click()
        await page.locator(`li#time-comparison-${timeComparison}`).click()
    }

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

    await page.locator(`div.apexchartscomparacion-${graficoId}`).waitFor({ state: 'visible', timeout: 75000 });
    const valorPeriodoAnteriorHTML = await page.locator(`span#${title}-periodo-anterior-monto`).innerHTML();
    const valorPeriodoActualHTML = await page.locator(`span#${title}-periodo-actual-monto`).innerHTML();
    const monedaPeriodoAnterior = await page.locator(`span#${title}-periodo-anterior-moneda`).innerHTML();
    const monedaPeriodoActual = await page.locator(`span#${title}-periodo-actual-moneda`).innerHTML();
    const valorComparativoHTML = await page.locator(`span#${title}-comparativo`).innerHTML();

    const accessToken = process.env.TOKEN ?? '';
    const response = await request.post(`${process.env.API_URL}/api/queries/exec/${queryId}`, {
        headers: {
            accessToken,
            'Content-Type': 'application/json'
        },
        data: { datePeriod, timeComparison },
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

    //if (title !== 'MARGEN\\%') 
    await expect(valorPeriodoAnteriorHTML.replaceAll(',', '')).toBe(valorPeriodoAnteriorApi.replace('.00', ''));
    await expect(valorPeriodoActualHTML.replaceAll(',', '')).toBe(valorPeriodoActualApi.replace('.00', ''));
    if (title === 'VENTAS') {
        await expect(monedaPeriodoAnterior).toBe(monedaApi);
        await expect(monedaPeriodoActual).toBe(monedaApi);
    }

    if (valorComparativoApi > 0) {
        await expect(valorComparativoHTML).toBe(`+${valorComparativoApi} ${title !== 'MARGEN\\%' ? '%' : ''}`);
        const icono = page.locator(`.${title}-arrow-up-icon`);
        await expect(icono).toBeVisible();
    } else {
        await expect(valorComparativoHTML).toBe(`${valorComparativoApi} ${title !== 'MARGEN\\%' ? '%' : ''}`);
        const icono = page.locator(`.${title}-arrow-down-icon`);
        await expect(icono).toBeVisible();
    }
}


