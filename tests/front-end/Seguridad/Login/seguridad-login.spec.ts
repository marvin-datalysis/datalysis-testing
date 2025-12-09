import { test, expect, chromium } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test.describe('Pruebas de Login (CP-44 y CP-45)', () => {

  // ============================================================
  // CP-44 — Login Correcto
  // ============================================================
  test.only('CP-44 - El usuario debe ingresar exitosamente al sistema', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);

    await login.goto();

    await login.login(
      "tesinaqa@datalysisgroup.com",
      "Tesina#2025"
    );

    // 1. Debe navegar fuera de la pantalla de login
    await expect(page).not.toHaveURL(/sign-in/);

    // 2. Validar que el Home/Inicio es visible (inglés o español)
    await expect(
      page.getByRole('button', { name: /home|inicio/i })
    ).toBeVisible({ timeout: 7000 });

    await browser.close();
  });

  // ============================================================
  // CP-45 — Login Incorrecto
  // ============================================================
  test('CP-45 - Login incorrecto debe mostrar mensaje de error', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);

    await login.goto();

    // Intento de login con contraseña inválida
    await login.login(
      "tesinaqa@datalysisgroup.com",
      "ContraseñaTotalmenteIncorrecta123!"
    );

    // 1. Asegurarse de que NO salió del login
    await expect(page).toHaveURL(/sign-in/);

    // 2. Validar que el mensaje de error aparece
    await expect(login.alertaError).toBeVisible({ timeout: 5000 });

    // 3. Validar el texto exacto del error
    const error = await login.obtenerError();
    expect(error).toBe("Las credenciales ingresadas no son válidas.");

    await browser.close();
  });

  test.only('CP-46 - Bloqueo tras múltiples intentos fallidos', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);

    await login.goto();

    // Número de intentos fallidos antes del mensaje de bloqueo
    const intentos = 15;

    for (let i = 1; i <= intentos; i++) {
        await login.login(
        "javier.velasquez@datalysisgroup.com",
        "PasswordIncorrecta" + i
        );

        // Esperar a que la UI procese cada intento
        await page.waitForTimeout(600);

        // Siempre debe seguir en sign-in
        expect(page.url()).toContain("sign-in");
    }

    // VALIDAR MENSAJE DE BLOQUEO
    await expect(login.alertaError).toBeVisible({ timeout: 5000 });

    const error = await login.obtenerError();

    expect(error).toBe(
        "No fue posible iniciar sessión. Por favor, vuelva a intentarlo más tarde."
    );

    await browser.close();
    });


});
