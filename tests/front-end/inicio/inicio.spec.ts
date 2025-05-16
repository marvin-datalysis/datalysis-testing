import * as dotenv from 'dotenv';
dotenv.config();

const { test, expect } = require('@playwright/test')
const { chromium } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
})

test.describe('prueba', () => {
    test('descripcion', async ({ page,request }) => {
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
        const page = await context.newPage();
        await page.goto('http://localhost:3000/inicio')*/

        await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
        await page.locator('input#email').fill(process.env.EMAIL)
        await page.locator('input#password').fill(process.env.PASSWORD)
        await page.locator('button#login').click()
        //await page.locator('div.apexchartscomparacion-ventas').waitFor({ state: 'visible', timeout: 35000 });
        await page.locator('span#VENTAS-periodo-anterior').waitFor({ state: 'visible', timeout: 35000 });
        const ventasPeriodoAnterior:string=await page.locator('span#VENTAS-periodo-anterior').innerHTML()
        console.log(ventasPeriodoAnterior)
        //await page.locator('button#periodo').click()
        //await page.locator('li#date-period-month').click()
        //await page.locator('div.apexchartscomparacion-ventas').waitFor({ state: 'visible', timeout: 60000 });
        //await page.locator('button#comparacion').click()
        //await page.locator('li#date-period-month').click()

        const accessToken = process.env.TOKEN;
        const response = await request.post('http://localhost:3001/api/queries/exec/6', {
            headers: {
                accessToken,
                'Content-Type': 'application/json'
            },
            data: { datePeriod: 'week', timeComparison: 'prior_period' },
        });

        const data = await response.json();
        const ventasPeriodoAnteriorApi:string=data.data.summary.firstPeriod.ventas;
        await expect(ventasPeriodoAnteriorApi).toBe(ventasPeriodoAnterior.replace(',',''))
    })
})