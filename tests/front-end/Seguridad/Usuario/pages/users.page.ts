import { Page, Locator, expect } from '@playwright/test';

export class UsersPage {
  readonly page: Page;

  // === Botones en Home-AdminUsuarios ===
  readonly btnConfiguration: Locator;
  readonly btnUsers: Locator;
  readonly btnAgregarUsuario: Locator;

  // === Inputs del formulario Crear/Editar Usuario ===
  readonly inputNombreCompleto: Locator;
  readonly inputDisplayName: Locator;
  readonly inputPosicion: Locator;
  readonly selectDepartamento: Locator;
  readonly inputTelefono: Locator;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly inputRepetirPassword: Locator;

  // Rol (lista generada dinámicamente)
  readonly rolesContainer: Locator;

  // Botón de guardar
  readonly btnGuardar: Locator;

  // Toast / mensaje de éxito
  readonly toastStatus: Locator;

  // Tabla de usuarios
  readonly tablaUsuarios: Locator;

  constructor(page: Page) {
    this.page = page;

    // === HOME → CONFIGURACIÓN / USUARIOS ===
    this.btnConfiguration = page.getByText('Configuración', { exact: true });
    this.btnUsers = page.getByText('Usuarios', { exact: true });

    this.btnAgregarUsuario = page.getByRole('button', { name: /agregar usuario|\+/i });

    // === Inputs formulario CREAR ===
    this.inputNombreCompleto = page.locator('#nombreCompletoUsuario');
    this.inputDisplayName = page.locator('#displayNameUsuario');
    this.inputPosicion = page.locator('#posicion');
    this.selectDepartamento = page.locator('#departamentoId');
    this.inputTelefono = page.locator('#telefono');
    this.inputEmail = page.locator('#usuarioEmail');
    this.inputPassword = page.locator('#password');
    this.inputRepetirPassword = page.locator('#repetirPassword');

    // === Roles ===
    this.rolesContainer = page.locator('[data-role="roles-list"]');

    // === Botón Guardar ===
    this.btnGuardar = page.locator('footer button[type="submit"]');

    // === Toast / mensaje de éxito ===
    // Único contenedor de mensajes del sistema
    this.toastStatus = page.locator('[role="status"]');


    // === Tabla de usuarios ===
    this.tablaUsuarios = page.locator('table');
  }

  // ===============================  
  // NAVEGACIÓN
  // ===============================
    async irAUsuarios() {
        // Abrir menú si está cerrado
        const menuBtn = this.page.locator('button[aria-label="open drawer"]');
        if (await menuBtn.isVisible()) {
            await menuBtn.click();
        }

        // Ir a Configuración
        await this.page.getByText('Configuración', { exact: true }).click();

        // Ir a Usuarios
        await this.page.getByText('Usuarios', { exact: true }).click();

        // Esperar que la URL realmente cambie a /usuarios
        await this.page.waitForURL(/\/usuarios/, { timeout: 10000 });

        // Reload para que el listado cargue con datos reales
        await this.page.reload();

        // Esperar a que existan filas en la tabla
        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 20000
        });
    }

  // ===============================  
  // CREAR USUARIO
  // ===============================
  async abrirFormularioCrear() {
    await this.btnAgregarUsuario.click();
    await this.inputNombreCompleto.waitFor();
  }

  async llenarFormulario(data: any) {
    await this.inputNombreCompleto.fill(data.nombreCompletoUsuario);
    await this.inputDisplayName.fill(data.displayNameUsuario);

    if (data.posicion) {
      await this.inputPosicion.fill(data.posicion);
    }

    await this.selectDepartamento.selectOption(data.departamentoId);

    if (data.telefono) {
      await this.inputTelefono.fill(data.telefono);
    }

    await this.inputEmail.fill(data.usuarioEmail);
    await this.inputPassword.fill(data.password);
    await this.inputRepetirPassword.fill(data.repetirPassword);
  }

    async seleccionarRol(rolId: string) {

    // Seleccionar el rol en el dropdown
    await this.page.locator('#roles').selectOption(rolId);

    // Esperar a que el panel se actualice
    await this.page.getByText(/roles seleccionados/i).waitFor();

    // Texto esperado del rol seleccionado
    const rolTexto = this.obtenerNombreRol(rolId);

    // Limitar la búsqueda SOLO al panel donde aparecen los roles seleccionados
    const panel = this.page.locator('div[role="radiogroup"]');

    // Esperar que dentro del radiogroup aparezca el rol correcto
    await panel.getByText(rolTexto, { exact: true }).first().waitFor();
    }


    // Mapeo auxiliar para validar que el rol esperado aparece
    private obtenerNombreRol(rolId: string) {
    const map: Record<string, string> = {
        "6": "Vendedor",
        "5": "Analista",
        "4": "Jefe de Sucursal Entrenamiento",
        "3": "Superusuario",
        "2": "Administrador",
        "1": "Jefe de Sucursal"
    };
    return map[rolId];
    }


  async guardar() {
    await this.btnGuardar.click();
  }

    async validarToastExito() {
    const toast = this.toastStatus;

    // Esperar a que aparezca el mensaje
    await expect(toast).toBeVisible({ timeout: 7000 });

    const texto = (await toast.innerText()).toLowerCase();

    // Validar que no haya Error
    expect(texto).not.toContain('error');
    }


    async validarUsuarioEnTabla(email: string) {
    // Regresar a /usuarios con URL absoluta
    await this.page.goto(`${process.env.APP_URL}/usuarios`);

    await this.page.reload();

    await this.page.locator('table tbody tr').first().waitFor({
        state: 'visible',
        timeout: 10000
    });

    const fila = this.page.getByRole('row', { name: new RegExp(email, 'i') });

    await expect(fila).toBeVisible({ timeout: 5000 });
    }

    // ===============================  
    // UTILIDAD: OBTENER PRIMER USUARIO
    // ===============================
    async obtenerPrimerEmail(): Promise<string> {
        const primeraFila = this.page.locator('table tbody tr').first();
        await expect(primeraFila).toBeVisible({ timeout: 7000 });

        // La columna 2 es el correo
        const email = await primeraFila.locator('td').nth(2).innerText();
        return email.trim();
    }

    // ===============================  
    // ELIMINAR PRIMER USUARIO DE LA TABLA
    // ===============================
    async abrirModalEliminarPrimerUsuario(): Promise<string> {
        const primeraFila = this.page.locator('table tbody tr').first();
        await expect(primeraFila).toBeVisible();

        const email = await primeraFila.locator('td').nth(2).innerText();

        const btnEliminar = primeraFila.locator('button').nth(1);
        await btnEliminar.click();

        // Esperar modal basado en el título visible del modal
        await expect(
            this.page.getByRole('heading', { name: 'Eliminar Usuario' })
        ).toBeVisible({ timeout: 7000 });

        return email.trim();
    }



    // ===============================  
    // ELIMINAR / INACTIVAR USUARIO
    // ===============================
  
    async abrirModalEliminarPorEmail(email: string) {
        // Ubica la fila que contiene el email
        const fila = this.page.getByRole('row', { name: new RegExp(email, 'i') });

        await expect(fila).toBeVisible({ timeout: 7000 });

        // Busca el botón de eliminar dentro de esa fila (icono de trash)
        const btnEliminar = fila.locator('button >> nth=1'); // El segundo botón: [Editar][Eliminar]
        await btnEliminar.click();

        // Esperar a que aparezca el modal de confirmación
        await expect(this.page.getByRole('dialog')).toBeVisible();
    }

    async confirmarEliminacion() {
        const btnConfirmar = this.page.getByRole('button', { name: 'Confirmar' });
        await btnConfirmar.click();
    }

    async esperarToastEliminacion() {
        // Filtra solo el toast real (no el skeleton loader)
        const toast = this.page.locator('[role="status"][aria-live="polite"]');

        await expect(toast).toBeVisible({ timeout: 7000 });

        const handle = await toast.elementHandle();
        if (!handle) {
            throw new Error("No se pudo obtener el elemento del toast");
        }

        // Esperar a que deje de decir "Eliminando usuario..."
        await this.page.waitForFunction(
            (el) => {
                const txt = (el as HTMLElement).innerText.toLowerCase();
                return !txt.includes('eliminando') && txt.length > 0;
            },
            handle,
            { timeout: 7000 }
        );

        return (await toast.innerText()).toLowerCase();
    }


    async validarUsuarioEliminado(email: string) {
        await this.page.reload();

        // Esperar a que cargue la tabla
        await this.page.locator('table tbody tr').first().waitFor({
            state: 'visible',
            timeout: 10000
        });

        const fila = this.page.getByRole('row', { name: new RegExp(email, 'i') });

        // No debe existir
        await expect(fila).toHaveCount(0);
    }



}
