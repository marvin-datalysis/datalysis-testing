// tests/auth/global-setup.ts
import { chromium, FullConfig, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
// Soporta USUARIO_QA/PASSWORD_QA y también EMAIL/PASSWORD
const USER = process.env.USUARIO_QA ?? process.env.EMAIL ?? '';
const PASS = process.env.PASSWORD_QA ?? process.env.PASSWORD ?? '';

export default async function globalSetup(_config: FullConfig) {
  if (!USER || !PASS) {
    throw new Error('Faltan credenciales en .env (USUARIO_QA/EMAIL y/o PASSWORD_QA/PASSWORD).');
  }

  // Deja visible mientras estabiliza, despues poner headless: true
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1) Ir al login
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'domcontentloaded' });

  // 2) EMAIL: esperar, llenar, verificar y reintentar 1 vez si falla
  const emailLoc = page.locator('input#email');
  await emailLoc.waitFor({ state: 'visible', timeout: 15000 });
  await emailLoc.fill(USER);
  let currentEmail = await emailLoc.inputValue();
  if (currentEmail !== USER) {
    // reintento: limpiar y volver a llenar
    await emailLoc.fill('');
    await emailLoc.type(USER, { delay: 10 });
    currentEmail = await emailLoc.inputValue();
  }
  await expect
    .soft(currentEmail === USER, `El campo email no quedó con el valor esperado. Leído: "${currentEmail}"`)
    .toBeTruthy();

  // 3) PASSWORD: llenar, verificar (algunas UIs ocultan el valor, pero inputValue debe retornar algo)
  const passLoc = page.locator('input#password');
  await passLoc.waitFor({ state: 'visible', timeout: 15000 });
  await passLoc.fill(PASS);
  let passVal = await passLoc.inputValue();
  if (!passVal) {
    // reintento: volver a llenar con tipeo lento
    await passLoc.fill('');
    await passLoc.type(PASS, { delay: 10 });
    passVal = await passLoc.inputValue();
  }
  await expect
    .soft(passVal !== '', 'El campo password quedó vacío después de llenar.')
    .toBeTruthy();

  // 4) Enviar (click + Enter como respaldo)
  const loginBtn = page.locator('button#login');
  await loginBtn.click().catch(() => {});
  await passLoc.press('Enter').catch(() => {});

  // 5) Esperar a salir de /auth/sign-in (20s) y a que la red quede ociosa
  const initialUrl = page.url();
  await page
    .waitForFunction(
      (u) => location.href !== u && !location.pathname.includes('/auth/sign-in'),
      initialUrl,
      { timeout: 20000 }
    )
    .catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // 6) Validación mínima: si seguimos en /auth/sign-in, fallar con mensaje claro
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/sign-in')) {
    throw new Error(`Login NO completado. URL actual: ${currentUrl}`);
  }

  // 7) Guardar sesión para todos los tests
  await context.storageState({ path: path.resolve(__dirname, './storageState.json') });
  await browser.close();
}