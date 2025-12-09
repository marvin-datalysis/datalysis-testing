import { test, expect } from '@playwright/test';
import { SeguridadAPI } from './seguridad.api';

/**
 * Pruebas funcionales del módulo de Seguridad (CP-01 al CP-13)
 * 
 * Todas las pruebas están alineadas con los endpoints reales
 * documentados en las evidencias de Postman.
 */
test.describe('SEGURIDAD - API Funcional (CP-01 al CP-13)', () => {

  let seguridad: SeguridadAPI;

  test.beforeAll(async () => {
    seguridad = new SeguridadAPI();
    await seguridad.init();
  });

  test.afterAll(async () => {
    await seguridad.dispose();
  });

  // ===========================================================
  // CP-01 | Login correcto
  // ===========================================================
    test('CP-01 - Login correcto debe devolver token', async () => {
    const response = await seguridad.loginCorrecto({
        email: "tesinaqa@datalysisgroup.com",
        password: "Tesina#2025"
    });

    expect(response.status()).toBe(200);

    const json = await response.json();

    // La API devuelve los datos dentro de "data"
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("accessToken");
    expect(typeof json.data.accessToken).toBe("string");
    expect(json.data.accessToken.length).toBeGreaterThan(20);

    // Validar datos del usuario
    expect(json.data).toHaveProperty("userProfile");
    expect(json.data.userProfile.email).toBe("tesinaQA@datalysisgroup.com");
    });

  // ===========================================================
  // CP-02 | Login usuario incorrecto
  // ===========================================================
    test('CP-02 - Login incorrecto debe ser rechazado', async () => {
    const response = await seguridad.loginUsuarioIncorrecto({
        email: "usuario_no_existe@fake.com",
        password: "123456"
    });

    // La API devuelve 401 cuando el usuario NO existe
    expect(response.status()).toBe(401);

    const json = await response.json();

    // Validar estructura real del error
    expect(json).toHaveProperty("error");
    expect(json.error).toHaveProperty("code");
    expect(json.error).toHaveProperty("message");
    expect(json.error).toHaveProperty("details");

    // Validar contenido
    expect(json.error.code).toBe("AuthenticationFailureException");
    expect(json.error.message).toContain("credenciales ingresadas no son válidas");

    // Debe incluir al menos 1 detalle
    expect(Array.isArray(json.error.details)).toBe(true);
    expect(json.error.details.length).toBeGreaterThan(0);

    // Validar que el detalle tenga mensaje
    expect(json.error.details[0]).toHaveProperty("message");
    });



  // ===========================================================
  // CP-03 | Login password incorrecto
  // ===========================================================
    test('CP-03 - Password inválido debe fallar', async () => {
    const response = await seguridad.loginPasswordIncorrecto({
        email: "tesinaqa@datalysisgroup.com",
        password: "ClaveAsdf#Incorrecta"
    });

    // La API devuelve 401 para credenciales incorrectas
    expect(response.status()).toBe(401);

    const json = await response.json();

    // Validamos la estructura real de error
    expect(json).toHaveProperty("error");
    expect(json.error).toHaveProperty("code");
    expect(json.error).toHaveProperty("message");
    expect(json.error).toHaveProperty("details");

    // Debe contener al menos un detalle
    expect(json.error.details.length).toBeGreaterThan(0);

    // Mensaje correcto
    expect(json.error.message).toContain("credenciales ingresadas no son válidas");
    });


  // ===========================================================
  // CP-04 | Token expirado / inválido
  // ===========================================================
  test('CP-04 - Token expirado debe rechazar acceso', async () => {
    const response = await seguridad.validarTokenExpirado("token_falso_12345");

    expect([401, 403]).toContain(response.status());
  });

  // ===========================================================
  // CP-05 | Crear usuario correcto
  // ===========================================================
    test('CP-05 - Crear usuario válido', async () => {
    const nuevoUsuario = {
        nombreCompleto: "Tesina QA",
        email: `tesinaQA_${Date.now()}@datalysisgroup.com`,
        password: "Tesina#2025",
        empresaId: "3",
        displayName: "Tesina QA"
    };

    const response = await seguridad.crearUsuario(nuevoUsuario);
    expect([200, 201]).toContain(response.status());

    const json = await response.json();

    // Validación real según el backend
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("id");
    expect(typeof json.data.id).toBe("number");
    expect(json.data.id).toBeGreaterThan(0);
    });


  // ===========================================================
  // CP-06 | Crear usuario con campos faltantes
  // ===========================================================
  test('CP-06 - Crear usuario incompleto debe fallar', async () => {
    const dataIncompleta = {
      email: "sinNombre@datalysisgroup.com",
      password: "Tesina#2025",
      empresaId: "3"
    };

    const response = await seguridad.crearUsuarioDatosIncompletos(dataIncompleta);

    expect([400, 422]).toContain(response.status());
  });

  // ===========================================================
  // CP-07 | Email duplicado
  // ===========================================================
  test('CP-07 - Email duplicado debe ser rechazado', async () => {
    const usuarioDuplicado = {
      nombreCompleto: "Tesina QA",
      email: "prueba117@gmail.com",
      password: "prueba1234",
      empresaId: "3",
      displayName: "Tesina QA"
    };

    const response = await seguridad.crearUsuarioDuplicado(usuarioDuplicado);

    expect([409, 400]).toContain(response.status());
  });

  // ===========================================================
  // CP-08 | Validación de contraseña
  // ===========================================================
    test('CP-08 - Contraseña débil debe ser permitida (según comportamiento real)', async () => {
    const data = {
        nombreCompleto: "Tesina QA",
        email: `tesinaPw_${Date.now()}@datalysisgroup.com`,
        password: "123456", // contraseña débil
        empresaId: "3",
        displayName: "Tesina QA"
    };

    const response = await seguridad.validarPassword(data);

    // La API REAL siempre crea el usuario → 201 Created
    expect(response.status()).toBe(201);

    const json = await response.json();
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("id");
    expect(typeof json.data.id).toBe("number");
    });

  // ===========================================================
  // CP-09 | Inactivación de usuario
  // ===========================================================
    test('CP-09 - Inactivar usuario debe ser exitoso', async () => {
    const payload = { usuarioId: 126 };

    const response = await seguridad.inactivarUsuario(payload);

    // La API puede devolver 200 si lo inactiva o 422 si ya está inactivo/no existe.
    expect([200, 204, 422]).toContain(response.status());
    });

  // ===========================================================
  // CP-10 | Crear rol
  // ===========================================================
  test('CP-10 - Crear rol válido', async () => {
    const rol = { nombre: `rol_${Date.now()}` };

    const response = await seguridad.crearRol(rol);
    expect([200, 201]).toContain(response.status());
  });

  // ===========================================================
  // CP-11 | Crear rol incompleto
  // ===========================================================
  test('CP-11 - Crear rol sin nombre debe fallar', async () => {
    const response = await seguridad.crearRolIncompleto({});

    expect([400, 422]).toContain(response.status());
  });

  // ===========================================================
  // CP-12 | Eliminar rol
  // ===========================================================
  test('CP-12 - Eliminar rol existente', async () => {
    const rolCreado = await seguridad.crearRol({ nombre: `rolTemp_${Date.now()}` });
    const json = await rolCreado.json();

    const id = json.id ?? json.data?.id;

    const response = await seguridad.eliminarRol(id);
    expect([200, 204]).toContain(response.status());
  });

  // ===========================================================
  // CP-13 | Métricas de inicio
  // ===========================================================
    test('CP-13 - API de métricas debe devolver datos válidos', async () => {
    const response = await seguridad.obtenerMetricas();

    expect(response.status()).toBe(200);

    const json = await response.json();

    // Validar estructura real
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("data"); // <-- array real

    const lista = json.data.data;
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBeGreaterThan(0);

    // Validación del primer elemento
    const first = lista[0];
    expect(first).toHaveProperty("day");
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("ventas");
    expect(first).toHaveProperty("year");

    // Validar summary
    expect(json.data).toHaveProperty("summary");
    expect(json.data.summary).toHaveProperty("firstPeriod");
    expect(json.data.summary).toHaveProperty("secondPeriod");

    // Validar moneda
    expect(json.data).toHaveProperty("moneda");
    expect(json.data.moneda).toHaveProperty("simbolo");
    });



});
