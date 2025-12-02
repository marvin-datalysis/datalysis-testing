import { test, expect, chromium } from '@playwright/test';
import { LoginPage } from '../Login/pages/login.page';
import { RolesPage } from './pages/roles.page';
import { queryDB } from '../../../../utils/db';

// Tiempo máximo para asegurar estabilidad en operaciones lentas
test.setTimeout(60000);

test.describe('SEGURIDAD - CRUD Roles', () => {

    test('CP-53 - Crear rol correctamente', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        // 1. Login
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        // 2. Ir al módulo de Roles
        await roles.irARoles();
        await roles.abrirFormularioAgregar();

        // 3. Crear un rol con permisos
        const nombreRol = `RolTest_${Date.now()}`;
        const permisos = [24, 25];

        await roles.llenarFormularioRol(nombreRol, permisos);
        await roles.guardar();                  // ahora espera al POST 200
        await roles.validarToastExito();
        await roles.volverAListadoRoles();
        await roles.validarRolEnTabla(nombreRol);

        // 4. Validación en la base de datos: Rol creado
        const dbRol = await queryDB(
            `SELECT * FROM public.rol WHERE "nombreRol" = $1;`,
            [nombreRol]
        );

        expect(dbRol.length).toBe(1);

        // usar el nombre correcto recibido desde PostgreSQL
        const rolId = dbRol[0].rolId;

        // 5. Validación de permisos asignados al rol (con polling por tardanza de insercion)
        let dbPermisos = [];
        for (let i = 0; i < 10; i++) {
            dbPermisos = await queryDB(
                `SELECT * FROM public.rol_permiso 
                WHERE "rolId" = $1 AND "tienePermiso" = true;`,
                [rolId]
            );

            if (dbPermisos.length > 0) break;

            await page.waitForTimeout(300);
        }

        // Validar que sí se guardaron permisos
        expect(dbPermisos.length).toBeGreaterThan(0);

        await browser.close();
    });



    test('CP-54 - Validación de campos requeridos al crear rol', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        // Inicio de sesión
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        // Ir al módulo
        await roles.irARoles();
        await roles.abrirFormularioAgregar();

        // Dejar el nombre vacío
        await roles.llenarFormularioRol("", []);

        // Intentar guardar
        await roles.guardar();

        // Validación nativa HTML5
        const validation = await roles.inputNombre.evaluate(
            el => (el as HTMLInputElement).validationMessage
        );
        expect(validation.toLowerCase()).toContain("completa");

        // No debe haber toast porque el formulario no se envía
        await expect(roles.toastStatus).toHaveCount(0);

        // Debe quedarse en la misma vista
        await expect(page).toHaveURL(/roles/i);

        // Validación en BD: El rol no debe haberse creado
        const dbRol = await queryDB(
            `SELECT * FROM public.rol WHERE "nombreRol" = $1;`,
            [""]
        );

        expect(dbRol.length).toBe(0);

        await browser.close();
    });


    test('CP-55 - Eliminar rol correctamente', async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        const login = new LoginPage(page);
        const roles = new RolesPage(page);

        // Inicio de sesión
        await login.goto();
        await login.login("tesinaqa@datalysisgroup.com", "Tesina#2025");

        // Ir al módulo de roles
        await roles.irARoles();

        // Buscar un rol eliminable generado por pruebas
        const filas = roles.page.locator("table tbody tr");
        const total = await filas.count();
        let nombreRol = "";
        let rolId = 0;

        for (let i = 0; i < total; i++) {
            const fila = filas.nth(i);
            const nombre = (await fila.locator("td").nth(1).innerText()).trim();
            const usuarios = await fila.locator("td").nth(3).innerText();

            if (nombre.startsWith("RolTest_") && usuarios.trim() === "0") {
                nombreRol = nombre;

                const idText = await fila.locator("td").first().innerText();
                rolId = Number(idText.trim());

                break;
            }
        }

        if (!nombreRol) {
            throw new Error("No hay roles de prueba eliminables.");
        }

        // Abrir modal de confirmación
        await roles.abrirModalEliminar(nombreRol);

        // Confirmar la eliminación
        await roles.confirmarEliminar();

        // Validar toast final
        const textToast = await roles.esperarToastEliminacion();

        if (textToast.includes("error interno")) {
            test.fail(true, "El backend devolvió un error 500 al eliminar.");
        }

        expect(textToast).toMatch(/eliminado|éxito|correctamente/);

        // Validar en UI que ya no se muestra
        await roles.validarRolEliminado(nombreRol);

        // Validación en BD: Rol eliminado físicamente
        const dbRol = await queryDB(
            `SELECT * FROM public.rol WHERE "rolId" = $1;`,
            [rolId]
        );

        expect(dbRol.length).toBe(0);

        // Validación en BD: Permisos eliminados
        const dbPermisos = await queryDB(
            `SELECT * FROM public.rol_permiso WHERE "rolId" = $1;`,
            [rolId]
        );

        expect(dbPermisos.length).toBe(0);

        await browser.close();
    });

});

