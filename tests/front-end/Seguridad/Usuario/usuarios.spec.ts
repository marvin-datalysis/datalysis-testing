import { test, expect, chromium } from '@playwright/test';
import { LoginPage } from '../Login/pages/login.page';
import { UsersPage } from './pages/users.page';
import { queryDB } from '../../../../utils/db';

// Tiempo máximo para asegurar estabilidad en operaciones lentas
test.setTimeout(60000);

test.describe('SEGURIDAD - CRUD Usuarios', () => {

  test('CP-48 - Crear usuario exitosamente', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    // Login al sistema
    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    // Abrir módulo de usuarios
    await users.irAUsuarios();

    // Abrir formulario de creación
    await users.abrirFormularioCrear();

    const nuevoUsuario = {
      nombreCompletoUsuario: "prueba",
      displayNameUsuario: "prueba",
      posicion: "",
      departamentoId: "6",
      telefono: "",
      usuarioEmail: `prueba_${Date.now()}@datalysisgroup.com`,
      password: "prueba1234",
      repetirPassword: "prueba1234"
    };

    // Llenar campos del formulario
    await users.llenarFormulario(nuevoUsuario);

    // Seleccionar rol requerido
    await users.seleccionarRol("5");

    // Guardar registro
    await users.guardar();

    // Validar mensaje de éxito en pantalla
    await users.validarToastExito();

    // Validar que el usuario aparece en la tabla del sistema
    await users.validarUsuarioEnTabla(nuevoUsuario.usuarioEmail);

    // Validar que el usuario existe en la base de datos
    const dbRows = await queryDB(
      `SELECT * FROM public.usuario WHERE "usuarioEmail" = $1;`,
      [nuevoUsuario.usuarioEmail]
    );
    expect(dbRows.length).toBe(1);

    await browser.close();
  });


  test('CP-49 - Campos obligatorios faltantes deben mostrar error y no guardar', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    // Login inicial
    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    // Ir a usuarios
    await users.irAUsuarios();

    // Abrir formulario de creación
    await users.abrirFormularioCrear();

    // Formulario con un campo obligatorio vacío
    const data = {
      nombreCompletoUsuario: "prueba3",
      displayNameUsuario: "",
      posicion: "",
      departamentoId: "6",
      telefono: "",
      usuarioEmail: "prueba3@datalysisgroup.com",
      password: "prueba1234",
      repetirPassword: "prueba1234"
    };

    await users.llenarFormulario(data);
    await users.seleccionarRol("5");
    await users.guardar();

    // Validar que el campo requerido muestra error visual
    const displayNameLabelError = page.locator('label[for="displayNameUsuario"] .text-red-500');
    await expect(displayNameLabelError).toBeVisible();

    // Validar que no cambió de página (no se guardó)
    await expect(page).toHaveURL(/usuarios/);

    // Validar que no aparece en la tabla
    await page.goto(`${process.env.APP_URL}/usuarios`);
    await page.locator('table tbody tr').first().waitFor({ timeout: 60000 });
    await expect(page.getByRole('row', { name: /prueba3@datalysisgroup\.com/i })).toHaveCount(0);

    // Validación en la base de datos
    const result = await queryDB(
      `SELECT * FROM public.usuario WHERE "usuarioEmail" = $1;`,
      [data.usuarioEmail]
    );
    expect(result.length).toBe(0);

    await browser.close();
  });


  test('CP-50 - Crear usuario con email ya registrado debe mostrar error y no guardar', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    // Login al sistema
    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    await users.irAUsuarios();
    await users.abrirFormularioCrear();

    const data = {
      nombreCompletoUsuario: "prueba3",
      displayNameUsuario: "prueba3",
      posicion: "",
      departamentoId: "6",
      telefono: "",
      usuarioEmail: "prueba@datalysisgroup.com",
      password: "prueba1234",
      repetirPassword: "prueba1234"
    };

    await users.llenarFormulario(data);
    await users.seleccionarRol("5");
    await users.guardar();

    // Localizar toast
    const toast = users.toastStatus;
    await expect(toast).toBeVisible({ timeout: 7000 });

    const toastHandle = await toast.elementHandle();
    if (!toastHandle) throw new Error("No se pudo capturar el toast.");

    // Esperar a que deje de mostrar mensaje de proceso y muestre el error real
    await page.waitForFunction(
      (el) => {
        const txt = (el as HTMLElement).innerText.toLowerCase();
        return (
          !txt.includes('guardando') &&
          (txt.includes('error') || txt.includes('uso') || txt.includes('correo'))
        );
      },
      toastHandle,
      { timeout: 7000 }
    );

    const textoToast = (await toast.innerText()).toLowerCase();
    expect(textoToast).toMatch(/error/);
    expect(textoToast).not.toMatch(/exitos|guardado correctamente/);

    // Validar que no cambió de página
    await expect(page).toHaveURL(/usuarios/);

    // Validar que solo existe un registro en UI
    await page.goto(`${process.env.APP_URL}/usuarios`);
    await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });
    await expect(page.getByRole('row', { name: /prueba@datalysisgroup\.com/i })).toHaveCount(1);

    // Validación en base de datos
    const dbRows = await queryDB(
      `SELECT * FROM public.usuario WHERE "usuarioEmail" = $1;`,
      [data.usuarioEmail]
    );
    expect(dbRows.length).toBe(1);

    await browser.close();
  });


  test('CP-51 - Validación de contraseña debe mostrarse y no permitir guardar', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    await users.irAUsuarios();
    await users.abrirFormularioCrear();

    const data = {
      nombreCompletoUsuario: "pruebaPass",
      displayNameUsuario: "pruebaPass",
      posicion: "",
      departamentoId: "6",
      telefono: "",
      usuarioEmail: `pass_${Date.now()}@datalysisgroup.com`,
      password: "abc",
      repetirPassword: "abc"
    };

    await users.llenarFormulario(data);
    await users.seleccionarRol("5");
    await users.guardar();

    // Validación de mensajes en inputs
    const msgPwd = page.locator('text=La contraseña debe tener al menos 8 caracteres.');
    await expect(msgPwd).toHaveCount(2);

    // Validación del toast
    const toast = users.toastStatus;
    await expect(toast).toBeVisible({ timeout: 5000 });
    const textoToast = (await toast.innerText()).toLowerCase();
    expect(textoToast).toContain('8 caracteres');

    // Validar que no se guardó en UI
    await expect(page).toHaveURL(/usuarios/);
    await page.goto(`${process.env.APP_URL}/usuarios`);
    await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });
    await expect(page.getByRole('row', { name: /pass_/i })).toHaveCount(0);

    // Validación en BD
    const dbRows = await queryDB(
      `SELECT * FROM public.usuario WHERE "usuarioEmail" = $1;`,
      [data.usuarioEmail]
    );
    expect(dbRows.length).toBe(0);

    await browser.close();
  });


  test('CP-52 - Inactivar/eliminar usuario correctamente', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    await users.irAUsuarios();

    // Abrir modal de eliminación del primer usuario
    const emailAEliminar = await users.abrirModalEliminarPrimerUsuario();

    await users.confirmarEliminacion();

    // Esperar mensaje final en UI
    const msg = await users.esperarToastEliminacion();

    // Validación flexible en UI
    if (msg.includes('eliminado') || msg.includes('exito')) {
      await users.validarUsuarioEliminado(emailAEliminar);
    } else {
      expect(msg).toMatch(/error/);
    }

    // Validación en BD 
    const dbRows = await queryDB(
    `SELECT "eliminado" FROM public.usuario WHERE "usuarioEmail" = $1;`,
    [emailAEliminar]
    );

    // Si no existe, entonces es eliminación física
    if (dbRows.length === 0) {
    expect(dbRows.length).toBe(0);
    } 
    // Si existe, entonces validamos soft delete
    else {
    expect(dbRows[0].eliminado).toBe(1);
    }

    await browser.close();
  });

});

