import * as dotenv from 'dotenv';
import { InicioCardResponse } from './inicio.interface';
import { test, expect } from '@playwright/test'
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
    await page.goto('http://localhost:3000')
    await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input#email').fill(process.env.EMAIL??'')
    await page.locator('input#password').fill(process.env.PASSWORD??'')
    await page.locator('button#login').click()
})

test.describe('inicio', () => {
    test('semana-periodo anterior', async ({ page,request }) => {
        await page.locator('div.apexchartscomparacion-ventas').waitFor({ state: 'visible', timeout: 35000 });
        const ventasPeriodoAnteriorMonto:string=await page.locator('span#VENTAS-periodo-anterior-monto').innerHTML();
        const ventasPeriodoActualMonto:string=await page.locator('span#VENTAS-periodo-actual-monto').innerHTML();
        const ventasPeriodoAnteriorMoneda:string=await page.locator('span#VENTAS-periodo-anterior-moneda').innerHTML();
        const ventasPeriodoActualMoneda:string=await page.locator('span#VENTAS-periodo-actual-moneda').innerHTML();
        const ventasComparativo:string=await page.locator('span#VENTAS-comparativo').innerHTML();
        //await page.locator('button#periodo').click()
        //await page.locator('li#date-period-month').click()
        //await page.locator('div.apexchartscomparacion-ventas').waitFor({ state: 'visible', timeout: 60000 });
        //await page.locator('button#comparacion').click()
        //await page.locator('li#date-period-month').click()

        const accessToken = process.env.TOKEN??'';
        const response = await request.post('http://localhost:3001/api/queries/exec/6', {
            headers: {
                accessToken,
                'Content-Type': 'application/json'
            },
            data: { datePeriod: 'week', timeComparison: 'prior_period' },
        });

        const data:InicioCardResponse = await response.json();

        const ventasSemanaAnterior=data.data.summary.firstPeriod.ventas;
        const ventasSemanaActual=data.data.summary.secondPeriod.ventas;
        const comparativoSemanaAnterior=data.data.summary.difference;
        const moneda=data.data.moneda.simbolo;

        await expect(ventasPeriodoAnteriorMonto.replace(',','')).toBe(ventasSemanaAnterior);
        await expect(ventasPeriodoAnteriorMoneda).toBe(moneda);
        await expect(ventasPeriodoActualMonto.replace(',','')).toBe(ventasSemanaActual);
        await expect(ventasPeriodoActualMoneda).toBe(moneda);
        if(comparativoSemanaAnterior>0){
            await expect(ventasComparativo).toBe(`+${comparativoSemanaAnterior} %`);
        }else{
            await expect(ventasComparativo).toBe(`-${comparativoSemanaAnterior} %`);
        }
    })
})

