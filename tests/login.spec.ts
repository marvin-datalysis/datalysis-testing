import { chromium, test } from '@playwright/test'
import * as dotenv from 'dotenv';
dotenv.config();

test.skip(process.env.SKIP_LOGIN==='1');

test.describe('login', () => {
  test('', async ({ }) => {
    const userDataDir = './context/chromium';
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
    });
    const page = await context.newPage();

    await page.goto(`${process.env.APP_URL}`)
    await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
    await page.locator('input#email').fill(process.env.EMAIL ?? '')
    await page.locator('input#password').fill(process.env.PASSWORD ?? '')
    await page.locator('button#login').click()
    await page.locator(`div.apexchartscomparacion-ventas`).waitFor({ state: 'visible', timeout: 75000 });
  })
})
