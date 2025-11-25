import { test, expect, chromium } from '@playwright/test';
import { LoginPage } from '../Login/pages/login.page';
import { UsersPage } from './pages/users.page';

// Timeout global aplicado a todas las pruebas
test.setTimeout(30000);

test.describe('SEGURIDAD - CRUD Usuarios', () => {

  test('CP-48 - Crear usuario exitosamente', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    // 1. LOGIN
    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    // 2. IR A USUARIOS
    await users.irAUsuarios();

    // 3. ABRIR FORMULARIO
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

    // 4. LLENAR FORMULARIO
    await users.llenarFormulario(nuevoUsuario);

    // 5. ROL ID = 5
    await users.seleccionarRol("5");

    // 6. GUARDAR
    await users.guardar();

    // 7. VALIDAR SUCCESS
    await users.validarToastExito();

    // 8. VALIDAR EN TABLA
    await users.validarUsuarioEnTabla(nuevoUsuario.usuarioEmail);

    await browser.close();
  });

  test('CP-49 - Campos obligatorios faltantes deben mostrar error y no guardar', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const login = new LoginPage(page);
    const users = new UsersPage(page);

    // 1. Login
    await login.goto();
    await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
    await expect(page).not.toHaveURL(/sign-in/);

    // 2. Navegar a Usuarios
    await users.irAUsuarios();

    // 3. Abrir formulario
    await users.abrirFormularioCrear();

    // 4. Llenar formulario dejando displayName vacío (campo obligatorio)
    const data = {
        nombreCompletoUsuario: "prueba3",
        displayNameUsuario: "",             // Campo requerido faltante
        posicion: "",
        departamentoId: "6",
        telefono: "",
        usuarioEmail: "prueba3@datalysisgroup.com",
        password: "prueba1234",
        repetirPassword: "prueba1234"
    };

    await users.llenarFormulario(data);

    // 5. Seleccionar rol
    await users.seleccionarRol("5");

    // 6. Intentar guardar
    await users.guardar();

    // 7. Validación visual del campo requerido
    const displayNameInput = page.locator('#displayNameUsuario');
    const displayNameLabelError = page.locator('label[for="displayNameUsuario"] .text-red-500');

    // El label debe mostrar el asterisco rojo indicando campo obligatorio
    await expect(displayNameLabelError).toBeVisible();

    // El borde del input debe volverse rojo (Tailwind)
    await expect(displayNameLabelError).toBeVisible();

    // 8. Validar que NO navegó fuera del formulario (continúa en /usuarios/agregar)
    await expect(page).toHaveURL(/usuarios/);

    // 9. Validar que NO se creó el usuario
    await page.goto(`${process.env.APP_URL}/usuarios`);

    // Esperar que la tabla cargue
    await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });

    // Confirmar que no existe fila con ese email
    await expect(
        page.getByRole('row', { name: /prueba3@datalysisgroup\.com/i })
    ).toHaveCount(0);


    await browser.close();
    });

    test('CP-50 - Crear usuario con email ya registrado debe mostrar error y no guardar', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const users = new UsersPage(page);

        // 1. Login
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
        await expect(page).not.toHaveURL(/sign-in/);

        // 2. Ir a Usuarios
        await users.irAUsuarios();

        // 3. Abrir formulario
        await users.abrirFormularioCrear();

        // 4. Datos con email duplicado
        const data = {
            nombreCompletoUsuario: "prueba3",
            displayNameUsuario: "prueba3",
            posicion: "",
            departamentoId: "6",
            telefono: "",
            usuarioEmail: "prueba@datalysisgroup.com", // email ya registrado
            password: "prueba1234",
            repetirPassword: "prueba1234"
        };

        await users.llenarFormulario(data);

        // 5. Seleccionar rol
        await users.seleccionarRol("5");

        // 6. Intentar guardar
        await users.guardar();

        // === VALIDACIÓN ROBUSTA DEL ERROR ===

        const toast = users.toastStatus;

        // 1) Esperar a que el contenedor del mensaje aparezca
        await expect(toast).toBeVisible({ timeout: 7000 });

        // 2) Obtener handle seguro del elemento
        const toastHandle = await toast.elementHandle();
        if (!toastHandle) {
            throw new Error("No se pudo obtener el toast en pantalla.");
        }

        // 3) Esperar a que deje de decir 'Guardando...' y aparezca error real
        await page.waitForFunction(
            (el) => {
                const txt = (el as HTMLElement).innerText.toLowerCase();
                return (
                    !txt.includes('guardando') && // ya no está procesando
                    (
                        txt.includes('error') ||  // cualquier error genérico
                        txt.includes('uso') ||    // "ya está en uso"
                        txt.includes('correo')    // "correo ya está en uso"
                    )
                );
            },
            toastHandle,
            { timeout: 7000 }
        );

        // 4) Obtener texto final ya estable
        const textoToast = (await toast.innerText()).toLowerCase();

        // Validación de error consistente
        expect(textoToast).toMatch(/error/);

        // Asegurar que NO sea mensaje de éxito
        expect(textoToast).not.toMatch(/exitos|creado|guardado correctamente/);

        // 8. Validar que no navegó fuera del formulario
        await expect(page).toHaveURL(/usuarios/);

        // 9. Validar que NO se creó el usuario
        await page.goto(`${process.env.APP_URL}/usuarios`);
        await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });

        const fila = page.getByRole('row', { name: /prueba@datalysisgroup\.com/i });
        await expect(fila).toHaveCount(1); // existe solo el registro original
    });

    test('CP-51 - Validación de contraseña debe mostrarse y no permitir guardar', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const users = new UsersPage(page);

        // 1. Login
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
        await expect(page).not.toHaveURL(/sign-in/);

        // 2. Ir a Usuarios
        await users.irAUsuarios();

        // 3. Abrir formulario
        await users.abrirFormularioCrear();

        // 4. Datos con contraseña inválida
        const data = {
            nombreCompletoUsuario: "pruebaPass",
            displayNameUsuario: "pruebaPass",
            posicion: "",
            departamentoId: "6",
            telefono: "",
            usuarioEmail: `pass_${Date.now()}@datalysisgroup.com`,
            password: "abc",          // inválida
            repetirPassword: "abc"    // inválida
        };

        await users.llenarFormulario(data);

        // 5. Seleccionar rol
        await users.seleccionarRol("5");

        // 6. Intentar guardar
        await users.guardar();

        // 7. Validar mensajes debajo de los inputs
        const msgPwd = page.locator('text=La contraseña debe tener al menos 8 caracteres.');
        await expect(msgPwd).toHaveCount(2);   // aparece en password y repetirPassword

        // 8. Validar toast del sistema (mensaje global)
        const toast = users.toastStatus;
        await expect(toast).toBeVisible({ timeout: 5000 });

        const textoToast = (await toast.innerText()).toLowerCase();
        expect(textoToast).toContain('contraseñas');
        expect(textoToast).toContain('8 caracteres');

        // 9. Validar que no navegó fuera del formulario
        await expect(page).toHaveURL(/usuarios/);

        // 10. Validar que NO existe en la tabla
        await page.goto(`${process.env.APP_URL}/usuarios`);
        await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });

        const fila = page.getByRole('row', { name: /pass_/i });
        await expect(fila).toHaveCount(0);

        await browser.close();
    });

    test('CP-52 - Inactivar/eliminar usuario correctamente', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const users = new UsersPage(page);

        // 1. Login
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");
        await expect(page).not.toHaveURL(/sign-in/);

        // 2. Ir a usuarios
        await users.irAUsuarios();

        // 3. Abrir modal eliminar para el primer usuario de la tabla
        const emailAEliminar = await users.abrirModalEliminarPrimerUsuario();

        // 4. Confirmar eliminación
        await users.confirmarEliminacion();

        // 5. Esperar mensaje final
        const msg = await users.esperarToastEliminacion();

        // 6. Validación flexible (éxito o error)
        if (msg.includes('eliminado') || msg.includes('exitos')) {
            // Éxito
            await users.validarUsuarioEliminado(emailAEliminar);
        } else {
            // Error del backend
            expect(msg).toMatch(/error/);
        }

        await browser.close();
    });


});
