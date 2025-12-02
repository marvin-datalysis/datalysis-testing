import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly btnLogin: Locator;
  readonly alertaError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Inputs exactos del DOM
    this.inputEmail = page.locator('#email');
    this.inputPassword = page.locator('#password');

    // Botón independiente del idioma
    this.btnLogin = page.getByRole('button', {
      name: /(iniciar sesión|sign in|login|log in)/i
    });

    // Mensaje de error REAL del DOM
    this.alertaError = page.locator('[data-slot="error-message"]');
  }

  async goto() {
    await this.page.goto(`${process.env.APP_URL}/es/auth/sign-in`);
  }

  /**
   * Método universal de login para CP-44 y CP-45
   * - Si el login es correcto, navegará fuera de /sign-in
   * - Si es incorrecto, seguirá en /sign-in y se mostrará el error
   */
  async login(email: string, password: string) {
    await this.inputEmail.waitFor({ state: 'visible' });

    await this.inputEmail.fill(email);
    await this.inputPassword.fill(password);

    await this.btnLogin.click();
  }

  /**
   * Devuelve el texto del mensaje de error si está visible
   */
  async obtenerError() {
    if (await this.alertaError.isVisible()) {
      return await this.alertaError.innerText();
    }
    return null;
  }
}
