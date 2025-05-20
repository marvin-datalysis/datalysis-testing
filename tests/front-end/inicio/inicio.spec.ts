import { InicioCardResponse } from './inicio.interface';
import { test, expect, Page, APIRequestContext } from '@playwright/test'
import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getAccessToken } from '../../../utils/getToken';
dotenv.config();

test.beforeEach(async ({ }) => {})

test.describe('tarjetas de inicio', () => {
    test('', async ({ request }) => {
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

        //week-same_period_last_year
        await actualizarDropdown({ page, boton: 'comparacion', opcion: 'time-comparison-same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'week', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'week', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'week', timeComparison: 'same_period_last_year' });

        //month-same_period_last_year
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-month' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'month', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'month', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'month', timeComparison: 'same_period_last_year' });

        //quarter-same_period_last_year
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-quarter' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'quarter', timeComparison: 'same_period_last_year' });

        //year-prior_period
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-year' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'year', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'year', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'year', timeComparison: 'prior_period' });

        //week-prior_period
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-week' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'week', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'week', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'week', timeComparison: 'prior_period' });

        //month-prior_period
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-month' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'month', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'month', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'month', timeComparison: 'prior_period' });

        //quarter-prior_period
        await actualizarDropdown({ page, boton: 'periodo', opcion: 'date-period-quarter' });
        await testTarjetaInicio({ page, request, title: 'MARGEN\\%', datePeriod: 'quarter', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'VENTAS', datePeriod: 'quarter', timeComparison: 'prior_period' });
        await testTarjetaInicio({ page, request, title: 'CLIENTES', datePeriod: 'quarter', timeComparison: 'prior_period' });
    })
})

const actualizarDropdown = async ({ page, boton, opcion }: { page: Page, boton: string, opcion: string }) => {
    await page.locator(`button#${boton}`).click()
    await page.locator(`li#${opcion}`).click()
}

export const testTarjetaInicio = async (
    { page, request, title, datePeriod, timeComparison }:
        { page: Page, request: APIRequestContext, title: string, datePeriod: string, timeComparison: string }
) => {
    console.log(`Probando. Tarjeta: ${title}, datePeriod: ${datePeriod}, timeComparison: ${timeComparison}`);

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

    const accessToken = await getAccessToken();
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

    await expect(Number(valorPeriodoAnteriorHTML.replaceAll(',', ''))).toBe(Number(valorPeriodoAnteriorApi));
    await expect(Number(valorPeriodoActualHTML.replaceAll(',', ''))).toBe(Number(valorPeriodoActualApi));
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


