// utils/api.ts
import { APIRequestContext, expect } from '@playwright/test';
import { getAccessToken } from './getToken';

// Importa el modelo común desde tus fixtures del módulo
// (ajusta la ruta si tu estructura difiere)
import {
  FilaVenta,
  aFechaISO,
  aNumero,
  aPorcentaje,
  redondear,
  construirClave,
} from '../tests/front-end/reporte-ventas/fixtures/modelo-ventas';

const MAPA_PAGO: Record<string, string> = {
  CASH: 'Contado',
  CREDIT: 'Crédito',
};

export interface ParametrosVentas {
  fechaMin?: string;
  fechaMax?: string;
  empresa?: string;
  numeroSucursal?: number | string;
  nombreEmpleado?: string;
  nombreCategoria?: string;
  // agrega aquí otros filtros si los usas en más CPM
}

export async function consultarVentas(
  request: APIRequestContext,
  apiBaseUrlFromEnv?: string,        // opcional para tests; si no viene, usamos process.env.API_URL
  params: ParametrosVentas = {}
): Promise<any[]> {
  const API_BASE = apiBaseUrlFromEnv ?? process.env.API_URL;
  if (!API_BASE) throw new Error('Falta API_URL en .env para consultar el backend');

  const token = await getAccessToken(); // 👈 obtiene/renueva Bearer automáticamente
  const url = `${API_BASE}/api/queries/exec/26?version=2`;

  const body: any = {
    // Defaults según Swagger; ajusta si tu UI tiene otros por defecto
    FechaMin: params.fechaMin ?? process.env.FECHA_MIN ?? '2024-03-01',
    FechaMax: params.fechaMax ?? process.env.FECHA_MAX ?? '2024-03-31',
    week: 0,
    month: 0,
    day: 0,
    quarter: 0,
    year: 0,
    nombreCliente: [''],
    numeroSucursal: params.numeroSucursal ? [Number(params.numeroSucursal)] : [],
    nombreEmpleado: params.nombreEmpleado ? [params.nombreEmpleado] : [],
    idProducto: [''],
    nombreProducto: [''],
    nombreCategoria: params.nombreCategoria ? [params.nombreCategoria] : [],
    porcentajeDescuento: [0, 100],
  };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'Authorization': `Bearer ${token}`, // 👈 header de auth
  };

  const res = await request.post(url, { data: body, headers });
  expect(res.ok(), `Fallo consultando ${url} (${res.status()})`).toBeTruthy();
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

// Mapea una fila JSON de API al modelo común usado por los tests
export function mapearFilaApi(api: any): FilaVenta {
  const idFactura = String(api.idFactura ?? '');
  const idProducto = String(api.idProducto ?? '');
  const nombreProducto = String(api.nombreProducto ?? '');
  const nombreCategoria = String(api.nombreCategoria ?? '');
  const nombreCliente = String(api.nombreCliente ?? '');
  const empresa = String(api.empresa ?? '');
  const numeroSucursal = String(api.numeroSucursal ?? '');
  const nombreEmpleado = String(api.nombreEmpleado ?? '');
  const condicionPago =
    MAPA_PAGO[String(api.condicionPago ?? '').toUpperCase()] ?? String(api.condicionPago ?? '');
  const fecha = aFechaISO(String(api.fecha ?? ''));

  const cantidad = aNumero(api.cantidad ?? 0);
  const precioUnitario = redondear(aNumero(api.precioUnitario ?? 0));
  const costoUnitario = redondear(aNumero(api.costoUnitario ?? 0));
  const descuentoUSD = redondear(aNumero(api.descuentoUSD ?? 0));
  const descuentoPct = aPorcentaje(aNumero(api.descuentoPct ?? 0));
  const margenUSD = redondear(aNumero(api.margenUSD ?? 0));
  const margenPct = aPorcentaje(aNumero(api.margenPct ?? 0));

  return {
    idFactura,
    idProducto,
    claveFila: construirClave(idFactura, idProducto, nombreProducto),
    nombreProducto,
    nombreCategoria,
    nombreCliente,
    empresa,
    numeroSucursal,
    nombreEmpleado,
    condicionPago,
    fecha,
    cantidad,
    precioUnitario,
    costoUnitario,
    descuentoUSD,
    descuentoPct,
    margenUSD,
    margenPct,
  };
}