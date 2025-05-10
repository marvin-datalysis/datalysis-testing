const { chromium } = require('playwright');

(async () => {
  const userDataDir = '/home/marvin/.config/microsoft-edge';
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: '/usr/bin/microsoft-edge', 
    headless: false,
  });
  const page = await context.newPage();
  await page.goto('https://example.com');

  // Aquí puedes usar tu sesión actual

  // await context.close(); // Opcional
})();
