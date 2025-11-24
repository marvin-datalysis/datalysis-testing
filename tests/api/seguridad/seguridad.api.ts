import { APIRequestContext, request } from '@playwright/test';
import { getAccessToken } from '../../../utils/getToken';

/**
 * Clase encargada de centralizar todas las llamadas a la API
 * del módulo de Seguridad. Está diseñada para ser utilizada
 * en los casos de prueba CP-01 al CP-13.
 */
export class SeguridadAPI {
  private api!: APIRequestContext;
  private baseUrl: string = process.env.API_URL || '';

  /**
   * Inicializa el contexto de API con un token válido.
   * Este contexto será reutilizado por la mayoría de pruebas,
   * excepto las que requieren tokens inválidos o expirados.
   */
  async init() {
    const token = await getAccessToken();

    this.api = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        accessToken: token,
        "Content-Type": "application/json"
      }
    });
  }

  async dispose() {
    await this.api.dispose();
  }

    // ======================================================
    // CP-01 | Login correcto (credenciales válidas)
    // Endpoint real extraído de Postman
    // ======================================================
    async loginCorrecto(payload: { email: string; password: string }) {
    return await this.api.post(`/api/usuarios/auth/sign-in`, {
        data: payload
    });
    }

    // ======================================================
    // CP-02 | Login incorrecto (usuario no existe)
    // ======================================================
    async loginUsuarioIncorrecto(payload: any) {
    return await this.api.post(`/api/usuarios/auth/sign-in`, {
        data: payload
    });
    }

    // ======================================================
    // CP-03 | Login incorrecto (password inválida)
    // ======================================================
    async loginPasswordIncorrecto(payload: any) {
    return await this.api.post(`/api/usuarios/auth/sign-in`, {
        data: payload
    });
    }

  // ======================================================
  // CP-04 | Token expirado o inválido
  // Esta prueba crea un contexto NUEVO con un token no válido.
  // ======================================================
  async validarTokenExpirado(expiredToken: string) {
    const api = await request.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        accessToken: expiredToken
      }
    });

    // El documento no muestra un endpoint para "validar token".
    // En la práctica, probamos cualquier endpoint protegido.
    return await api.get(`/api/usuarios/usuarios`);
  }

  // ======================================================
  // CP-05 | Crear usuario válido
  // Endpoint real extraído del documento PDF
  // ======================================================
  async crearUsuario(data: any) {
    return await this.api.post(`/api/usuarios/usuarios`, { data });
  }

  // ======================================================
  // CP-06 | Crear usuario con campos faltantes
  // Mismo endpoint que CP-05
  // ======================================================
  async crearUsuarioDatosIncompletos(data: any) {
    return await this.api.post(`/api/usuarios/usuarios`, { data });
  }

  // ======================================================
  // CP-07 | Email duplicado
  // Mismo endpoint, pero esperando un 409 Conflict
  // ======================================================
  async crearUsuarioDuplicado(data: any) {
    return await this.api.post(`/api/usuarios/usuarios`, { data });
  }

  // ======================================================
  // CP-08 | Validación de contraseña
  // Endpoint idéntico; la API valida el password internamente
  // ======================================================
  async validarPassword(data: any) {
    return await this.api.post(`/api/usuarios/usuarios`, { data });
  }

  // ======================================================
  // CP-09 | Inactivación de usuario
  // Endpoint real mostrado en evidencia
  // ======================================================
  async inactivarUsuario(payload: { usuarioId: number }) {
    return await this.api.put(`/api/usuarios/usuarios/delete`, { data: payload });
  }

  // ======================================================
  // CP-10 | Creación de rol válido
  // ======================================================
  async crearRol(data: any) {
    return await this.api.post(`/api/usuarios/roles`, { data });
  }

  // ======================================================
  // CP-11 | Creación de rol sin campos requeridos
  // ======================================================
  async crearRolIncompleto(data: any) {
    return await this.api.post(`/api/usuarios/roles`, { data });
  }

  // ======================================================
  // CP-12 | Eliminación de rol
  // Endpoint real: DELETE /roles/{id}
  // ======================================================
  async eliminarRol(id: number) {
    return await this.api.delete(`/api/usuarios/roles/${id}`);
  }

  // ======================================================
  // CP-13 | Métricas de inicio (ventas, clientes, margen %)
  // Endpoint real: POST /api/queries/exec/6
  // ======================================================
  async obtenerMetricas() {
    return await this.api.post(`/api/queries/exec/6`, {
      data: {
        datePeriod: "month",
        timeComparison: "prior_period"
      }
    });
  }

  // ======================================================
  // Validación genérica de la estructura base de seguridad
  // Usada como apoyo en varios CP para validar consistencia del JSON
  // ======================================================
  validarEstructuraSeguridad(json: any) {
    return (
      json &&
      typeof json === 'object' &&
      'success' in json &&
      'message' in json
    );
  }
}
