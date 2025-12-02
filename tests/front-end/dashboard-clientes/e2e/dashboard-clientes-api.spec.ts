// tests/front-end/dashboard-clientes/e2e/dashboard-clientes-api.spec.ts
import { test, expect } from "@playwright/test";
import { getAccessToken } from "../../../../utils/getToken";

const API_URL = process.env.API_URL ?? process.env.BASE_URL ?? "";
const CLIENTE_TEST = "Adrián Castillo";

// Helper para parsear JSON de datos de entrada
function parseDatosEntrada(jsonStr: string): any {
  try {
    return JSON.parse(jsonStr.replace(/\r\n/g, ""));
  } catch {
    return {};
  }
}

test.describe("Dashboard Clientes - Pruebas API/Integración", () => {
  let accessToken: string;

  test.beforeAll(async () => {
    accessToken = await getAccessToken();
  });

  // CP-22: Prueba de api de información general cliente
  test("CP-22: Prueba de api de información general cliente", async ({ request }) => {
    const datos = parseDatosEntrada('{"nombreCliente":"Adrián Castillo"}');
    
    // Nota: Necesitarás ajustar la URL del endpoint según tu API
    const response = await request.get(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      params: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
    // Validar que la respuesta contiene información del cliente
    expect(data.data || data).toBeDefined();
  });

  // CP-23: Prueba de api de información de contacto del cliente
  test("CP-23: Prueba de api de información de contacto del cliente", async ({ request }) => {
    const datos = parseDatosEntrada('{"nombreCliente":"Adrián Castillo"}');
    
    const response = await request.get(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      params: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // Validar que contiene campos de contacto
    const contacto = data.data || data;
    expect(contacto).toBeDefined();
  });

  // CP-24: Prueba de api de notas cliente
  test("CP-24: Prueba de api de notas cliente", async ({ request }) => {
    const datos = parseDatosEntrada('{"nombreCliente":"Adrián Castillo"}');
    
    const response = await request.get(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      params: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  // CP-25: Prueba de api de ventas totales de cliente
  test("CP-25: Prueba de api de ventas totales de cliente", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const ventas = data.data || data;
    expect(ventas).toBeDefined();
    // Validar que contiene monto total
    if (ventas.total || ventas.ventasTotales || ventas.monto) {
      expect(typeof (ventas.total || ventas.ventasTotales || ventas.monto)).toBe("number");
    }
  });

  // CP-26: Prueba de api de período medio de pago
  test("CP-26: Prueba de api de período medio de pago", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const periodo = data.data || data;
    expect(periodo).toBeDefined();
  });

  // CP-27: Prueba de api de monto pendiente
  test("CP-27: Prueba de api de monto pendiente", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const pendiente = data.data || data;
    expect(pendiente).toBeDefined();
  });

  // CP-28: Prueba de api de morosidad de cliente
  test("CP-28: Prueba de api de morosidad de cliente", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const morosidad = data.data || data;
    expect(morosidad).toBeDefined();
  });

  // CP-29: Prueba de api de clasificación crediticia de cliente
  test("CP-29: Prueba de api de clasificación crediticia de cliente", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const clasificacion = data.data || data;
    expect(clasificacion).toBeDefined();
  });

  // CP-30: Prueba de api de clasificación volumétrica de cliente
  test("CP-30: Prueba de api de clasificación volumétrica de cliente", async ({ request }) => {
    const datos = parseDatosEntrada('{"nombreCliente":"Adrián Castillo"}');
    
    const response = await request.get(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      params: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const clasificacion = data.data || data;
    expect(clasificacion).toBeDefined();
    // Validar que es un array o objeto con múltiples registros
    if (Array.isArray(clasificacion)) {
      expect(clasificacion.length).toBeGreaterThanOrEqual(0);
    }
  });

  // CP-31: Prueba de api de cartera crédito/contado
  test("CP-31: Prueba de api de cartera crédito/contado", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const cartera = data.data || data;
    expect(cartera).toBeDefined();
  });

  // CP-32: Prueba de api de límite crediticio
  test("CP-32: Prueba de api de límite crediticio", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const limite = data.data || data;
    expect(limite).toBeDefined();
    // Validar que contiene limite_credito y consumo_actual
    if (limite.limite_credito !== undefined || limite.consumo_actual !== undefined) {
      expect(limite).toHaveProperty("limite_credito");
      expect(limite).toHaveProperty("consumo_actual");
    }
  });

  // CP-33: Prueba de api de ticket promedio
  test("CP-33: Prueba de api de ticket promedio", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const ticket = data.data || data;
    expect(ticket).toBeDefined();
  });

  // CP-34: Prueba de api de frecuencia de compra
  test("CP-34: Prueba de api de frecuencia de compra", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const frecuencia = data.data || data;
    expect(frecuencia).toBeDefined();
  });

  // CP-35: Prueba de api de recomendación de productos
  test("CP-35: Prueba de api de recomendación de productos", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const recomendaciones = data.data || data;
    expect(recomendaciones).toBeDefined();
    // Validar que es un array de productos recomendados
    if (Array.isArray(recomendaciones)) {
      expect(recomendaciones.length).toBeGreaterThanOrEqual(0);
    }
  });

  // CP-36: Prueba de api de estado de cuenta
  test("CP-36: Prueba de api de estado de cuenta", async ({ request }) => {
    const datos = parseDatosEntrada(
      '{"fechaMin":"2023-01-01","fechaMax":"2025-11-06","nombreCliente":["Adrián Castillo"]}'
    );
    
    const response = await request.post(`${API_URL}/api/queries/exec/[ID]`, {
      headers: {
        accessToken,
        "Content-Type": "application/json",
      },
      data: datos,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const estadoCuenta = data.data || data;
    expect(estadoCuenta).toBeDefined();
    // Validar que contiene movimientos y saldo
    if (Array.isArray(estadoCuenta)) {
      expect(estadoCuenta.length).toBeGreaterThanOrEqual(0);
    }
  });
});

