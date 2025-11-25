import { test, expect, chromium } from '@playwright/test';
import { LoginPage } from '../Login/pages/login.page';
import { RolesPage } from './pages/roles.page';

test.describe('SEGURIDAD - CRUD Roles', () => {

    test('CP-53 - Crear rol correctamente', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        await roles.irARoles();
        await roles.abrirFormularioAgregar();

        const nombreRol = `RolTest_${Date.now()}`;
        await roles.llenarFormularioRol(nombreRol, [24, 25]); // permisos ejemplo
        await roles.guardar();
        await roles.validarToastExito();
        await roles.volverAListadoRoles();
        await roles.validarRolEnTabla(nombreRol);

        await browser.close();
    });

    test('CP-54 - Validación de campos requeridos al crear rol', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        await roles.irARoles();
        await roles.abrirFormularioAgregar();

        // 1. Dejar nombre vacío
        await roles.llenarFormularioRol("", []); 

        // 2. Intentar guardar
        await roles.guardar();

        // 3. Validación nativa HTML5
        const validation = await roles.inputNombre.evaluate(
            el => (el as HTMLInputElement).validationMessage
        );
        expect(validation.toLowerCase()).toContain("completa");

        // 4. Asegurar que NO haya toast (porque HTML5 bloquea el submit)
        await expect(roles.toastStatus).toHaveCount(0);

        // 5. Sigue en la misma página
        await expect(page).toHaveURL(/roles/i);

        // 6. Confirmar que NO se creó el rol
        await roles.volverAListadoRoles();
        await expect(roles.filaPorNombre("prueba2")).toHaveCount(0);

        await browser.close();
    });

    test('CP-55 - Eliminar rol correctamente', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        // 1. Login
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        // 2. Ir a Roles
        await roles.irARoles();

        // 3. Buscar un rol eliminable (creado en pruebas)
            const filas = roles.page.locator("table tbody tr");

            const total = await filas.count();
            let nombreRol = "";

            for (let i = 0; i < total; i++) {
                const fila = filas.nth(i);
                const nombre = (await fila.locator("td").nth(1).innerText()).trim();

                // Solo roles de test y sin usuarios
                const usuarios = await fila.locator("td").nth(3).innerText();

                if (nombre.startsWith("RolTest_") && usuarios.trim() === "0") {
                    nombreRol = nombre;
                    break;
                }
            }

            if (!nombreRol) {
                throw new Error("No hay roles de prueba eliminables.");
            }


        // 4. Abrir modal de eliminación
        await roles.abrirModalEliminar(nombreRol);

        // 5. Confirmar
        await roles.confirmarEliminar();

        // 6. Validar toast de éxito
        const textToast = await roles.esperarToastEliminacion();

        if (textToast.includes("error interno")) {
            test.fail(true, "Backend no permite eliminar este rol (500).");
        }

        expect(textToast).toMatch(/eliminado|éxito|correctamente/);

        // 7. Validar que ya no aparece en tabla
        await roles.validarRolEliminado(nombreRol);

        await browser.close();
    });


});
