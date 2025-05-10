// save-auth.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  // inicia sesión manualmente

  // espera un poco para que el login se complete
  await page.waitForTimeout(10000);

  // guarda la sesión
  await context.storageState({ path: 'auth.json' });

  await browser.close();
})();
