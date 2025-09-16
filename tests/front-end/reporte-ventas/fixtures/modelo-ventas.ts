// Definicion del modelo comun de fila y funciones de normalizacion
// Nos va a servir para comparar UI vs API en un formato uniforme

export interface FilaVenta {
  idFactura: string;
  idProducto: string;
  claveFila: string;

  nombreProducto: string;
  nombreCategoria: string;
  nombreCliente: string;

  empresa: string;
  numeroSucursal: string;
  nombreEmpleado: string;
  condicionPago: string;

  fecha: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  descuentoUSD: number;
  descuentoPct: number;
  margenUSD: number;
  margenPct: number;
  totalLineaUSD?: number;
}

export function aNumero(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  const limpio = valor.replace(/\s/g, '').replace(/[,](?=\d{2}\b)/, '.').replace(/[,.](?=\d{3}\b)/g, '');
  const n = Number(limpio.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function aPorcentaje(valor: number): number {
  return valor <= 1 ? +(valor * 100).toFixed(2) : +valor.toFixed(2);
}

export function aFechaISO(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return d;
}

export function redondear(n: number): number {
  return +(+n).toFixed(2);
}

export function construirClave(idFactura: string, idProducto: string, fallbackProducto?: string): string {
  const a = (idFactura ?? '').trim();
  const b = (idProducto ?? fallbackProducto ?? '').trim().toLowerCase();
  return `${a}|${b}`;
}