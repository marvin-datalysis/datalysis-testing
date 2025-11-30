import { Page, expect } from '@playwright/test';

export class RolesPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ================================
    // NAVBAR  ir a Roles y Permisos
    // ================================
    async irARoles() {
        // Abrir menú si está cerrado
        const menuBtn = this.page.locator('button[aria-label="open drawer"]');
        if (await menuBtn.isVisible()) {
            await menuBtn.click();
        }

        // Entrar a Configuración
        await this.page.getByText('Configuración', { exact: true }).click();

        // Ir a Roles y Permisos
        await this.page.getByText('Roles y Permisos', { exact: true }).click();

        // Validar que realmente navegó a /roles o /roles-permisos
        await this.page.waitForURL(/roles/i, { timeout: 10000 });

        // Hacer reload para que cargue mucho más rápido
        await this.page.reload();

        // Esperar a que la tabla renderice (igual que Usuarios)
        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 20000
        });
    }


    // ================================
    // BOTONES GENERALES
    // ================================
    get btnAgregarRol() {
        return this.page.locator('button', { hasText: /agregar rol|crear rol/i }).first();
    }

    // ================================
    // AGREGAR ROL
    // ================================
    async abrirFormularioAgregar() {
        await this.btnAgregarRol.waitFor({ timeout: 7000 });
        await this.btnAgregarRol.click();

        // Basado en AgregarRol.html :contentReference[oaicite:0]{index=0}
        await expect(
            this.page.getByRole('heading', { name: 'Agregar Rol' })
        ).toBeVisible({ timeout: 7000 });
    }

    // Inputs
    get inputNombre() {
        return this.page.locator('#nombre');
    }

    async llenarFormularioRol(nombre: string, permisos: number[]) {
        await this.inputNombre.fill(nombre);

        for (const id of permisos) {
            await this.page.locator(`input[type="checkbox"][value="${id}"]`).check();
        }
    }

    async guardar() {
        const boton = this.page.getByRole('button', { name: /crear|guardar/i });

        await Promise.all([
            this.page.waitForResponse(res =>
            res.request().method() === 'POST' &&
            res.url().includes('/rol') &&
            res.status() === 200
            ),
            boton.click()
        ]);

        await this.validarToastExito();
    }



    // Toast (mismo patrón que usuarios)
    get toastStatus() {
        return this.page.locator('[role="status"]:not(:has(svg))');
    }

    async validarToastExito() {
        const toast = this.toastStatus;
        await expect(toast).toBeVisible({ timeout: 7000 });
        const text = (await toast.innerText()).toLowerCase();
        expect(text).not.toContain('error');
    }

    // ================================
    // LISTADO – BUSCAR FILA POR NOMBRE
    // Basado en Home-AdminRoles.html :contentReference[oaicite:1]{index=1}
    // ================================
    filaPorNombre(nombre: string) {
        return this.page.getByRole('row', { name: new RegExp(nombre, 'i') });
    }

    async validarRolEnTabla(nombre: string) {
        await this.page.reload();

        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 7000
        });

        await expect(this.filaPorNombre(nombre)).toBeVisible();
    }

    // ================================
    // EDITAR UN ROL
    // ================================
    async abrirModalEditar(nombreRol: string) {
        const fila = this.filaPorNombre(nombreRol);
        await expect(fila).toBeVisible();

        // primer botón: editar
        await fila.locator('button').first().click();

        await expect(
            this.page.getByRole('heading', { name: 'Editar Rol' })
        ).toBeVisible({ timeout: 7000 });
    }

    async volverAListadoRoles() {
        await this.page.goto(`${process.env.APP_URL}/usuarios/roles-permisos`);
        await this.page.reload();

        // esperar que la tabla esté visible
        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 20000
        });
    }
    
    get errorNombre() {
        return this.page.locator('span.text-red-500', { hasText: /nombre/i });
    }

    // ================================
    // ABRIR MODAL DE ELIMINACIÓN
    // ================================
    async abrirModalEliminar(nombreRol: string) {
        const fila = this.filaPorNombre(nombreRol);
        await expect(fila).toBeVisible({ timeout: 7000 });

        // botón 2 = eliminar
        await fila.locator('button').nth(1).click();

        // Esperar modal basado en el título
        await expect(
            this.page.getByRole('heading', { name: 'Eliminar Rol' })
        ).toBeVisible({ timeout: 7000 });
    }

    // ================================
    // CONFIRMAR ELIMINACIÓN
    // ================================
    async confirmarEliminar() {
        await this.page.getByRole('button', { name: 'Confirmar' }).click();
    }

    // ================================
    // ESPERAR TOAST DE ÉXITO
    // ================================
    async esperarToastEliminacion(): Promise<string> {

        // Filtra solo el mensaje real, no el skeleton
        const toast = this.page.locator('[role="status"][aria-live="polite"]');

        await expect(toast).toBeVisible({ timeout: 7000 });

        const handle = await toast.elementHandle();
        if (!handle) throw new Error('Toast no disponible');

        await this.page.waitForFunction(
            el => {
                const txt = (el as HTMLElement).innerText.toLowerCase();
                return !txt.includes('eliminando') && txt.length > 0;
            },
            handle,
            { timeout: 7000 }
        );

        return (await toast.innerText()).toLowerCase();
    }

    // ================================
    // VALIDAR QUE EL ROL YA NO ESTÁ
    // ================================
    async validarRolEliminado(nombreRol: string) {
        await this.page.reload();

        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 15000
        });

        const fila = this.filaPorNombre(nombreRol);
        await expect(fila).toHaveCount(0);
    }


}
