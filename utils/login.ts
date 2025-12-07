import { Page } from "@playwright/test"

export const login = async (page: Page) => {
  await page.locator('input#email').waitFor({ state: 'visible', timeout: 5000 })
  await page.locator('input#email').fill(process.env.EMAIL ?? '')
  await page.locator('input#password').fill(process.env.PASSWORD ?? '')
  await page.locator('button#login').click()

  // Esperar a que salga de /sign-in y cargue el layout principal
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 60000 });

  // Señal más estable de layout cargado (menú lateral)
  await page.locator('button[aria-label="open drawer"]').waitFor({ state: 'visible', timeout: 30000 });
}
