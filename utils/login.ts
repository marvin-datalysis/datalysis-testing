import { Page } from "@playwright/test"

export const login = async (page: Page) => {
  await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
  await page.locator('input#email').fill(process.env.EMAIL ?? '')
  await page.locator('input#password').fill(process.env.PASSWORD ?? '')
  await page.locator('button#login').click()
  await page.locator(`div.apexchartscomparacion-ventas`).waitFor({ state: 'visible', timeout: 75000 });
}