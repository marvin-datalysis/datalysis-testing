// utils/api.ts
// Utilidades de API para CPM-13 (Reporte de Ventas) con auth real de Datalysis
// Node 18+ (fetch nativo)

type RangoFecha = { desde: string; hasta: string };

export interface FiltrosVentas {
  rango: RangoFecha;
  sucursalId?: string;
  vendedorId?: string;
  pagina?: number;
  limite?: number;
  texto?: string;
}

export interface Venta {
  id: string;
  fecha: string;       // ISO
  sucursal: string;
  vendedor: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface RespuestaVentas {
  items: Venta[];
  totalItems: number;
  totalPaginas: number;
  sumatoria: {
    cantidad: number;
    total: number;
  };
}

// ========= .env =========
// Recomendado: API_URL=http://localhost:3001   (con o sin /api)
const RAW_API_URL = process.env.API_URL!;   // puede venir con o sin /api
const EMAIL = process.env.EMAIL!;
const PASSWORD = process.env.PASSWORD!;

// Normaliza base y añade /api si falta
function withApiPrefix(u: string): string {
  const base = u.replace(/\/+$/, "");
  return /\/api$/i.test(base) ? base : `${base}/api`;
}
const API_BASE = withApiPrefix(RAW_API_URL);

// ------------------ Helpers numéricos ------------------

export function monedaATextoSeguro(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "0";
  const num = typeof n === "string" ? parseFloat(n.replace(/[^\d.-]/g, "")) : n;
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function textoAMonedaSeguro(texto: string): number {
  if (!texto) return 0;
  const limpio = texto.replace(/\s/g, "").replace(/[^\d.-]/g, "");
  const n = parseFloat(limpio);
  return Number.isNaN(n) ? 0 : n;
}

export function sumar<T>(arr: T[], sel: (x: T) => number): number {
  return arr.reduce((acc, it) => acc + (sel(it) || 0), 0);
}

async function safeText(r: Response) {
  try { return await r.text(); } catch { return "<sin cuerpo>"; }
}
async function safeJSON<T = any>(r: Response): Promise<T | null> {
  try { return await r.json(); } catch { return null; }
}

// ------------------ Autenticación Datalysis ------------------

/**
 * Flujo robusto para tu backend (según logs):
 * 1) POST /usuarios/auth/sign-in        -> JSON con accessToken y/o Set-Cookie
 * 2) POST /usuarios/auth/exchange-token -> Set-Cookie de sesión (a veces)
 * Devuelve { cookie?, bearer? } para siguientes requests.
 */
export async function iniciarSesionYObtenerSesion(): Promise<{ cookie?: string; bearer?: string }> {
  // 1) sign-in
  const signInURL = `${API_BASE}/usuarios/auth/sign-in`;
  const signIn = await fetch(signInURL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, rememberMe: true }),
    redirect: "manual",
  });

  if (!signIn.ok) {
    const body = await safeText(signIn);
    throw new Error(`Login falló en sign-in (${signIn.status}): ${body}`);
  }

  const setCookie1 = signIn.headers.get("set-cookie") ?? "";
  const json1 = await safeJSON<any>(signIn);
  const bearer = json1?.accessToken ?? json1?.token ?? json1?.access_token ?? undefined;

  // 2) exchange-token (fija cookie de sesión en varios setups)
  let cookie = "";
  try {
    const exchangeURL = `${API_BASE}/usuarios/auth/exchange-token`;
    const exchange = await fetch(exchangeURL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        ...(bearer ? { "Authorization": `Bearer ${bearer}` } : {}),
        ...(setCookie1 ? { "Cookie": setCookie1.split(",").map(s => s.split(";")[0]).join("; ") } : {}),
      },
      redirect: "manual",
    });
    if (exchange.ok) {
      const setCookie2 = exchange.headers.get("set-cookie");
      if (setCookie2) {
        cookie = setCookie2.split(",").map(s => s.split(";")[0]).join("; ");
      }
    }
  } catch {
    // toleramos 404/errores de red en exchange
  }

  if (!cookie && setCookie1) {
    cookie = setCookie1.split(",").map(s => s.split(";")[0]).join("; ");
  }

  if (!cookie && !bearer) {
    throw new Error("No se obtuvo cookie ni bearer tras sign-in/exchange-token.");
  }

  return { cookie: cookie || undefined, bearer };
}

// ------------------ Ventas ------------------

export async function consultarVentasConSesion(
  filtros: FiltrosVentas,
  sesion?: { cookie?: string; bearer?: string }
): Promise<RespuestaVentas> {
  const s = sesion ?? (await iniciarSesionYObtenerSesion());

  const params = new URLSearchParams();
  params.set("desde", filtros.rango.desde);
  params.set("hasta", filtros.rango.hasta);
  if (filtros.sucursalId) params.set("sucursalId", filtros.sucursalId);
  if (filtros.vendedorId) params.set("vendedorId", filtros.vendedorId);
  if (typeof filtros.pagina === "number") params.set("page", String(filtros.pagina));
  if (typeof filtros.limite === "number") params.set("limit", String(filtros.limite));
  if (filtros.texto) params.set("q", filtros.texto);

  const headers: Record<string, string> = { "Accept": "application/json" };
  if (s.cookie) headers["Cookie"] = s.cookie;
  if (s.bearer) headers["Authorization"] = `Bearer ${s.bearer}`;

  // Intento 1: /ventas
  let resp = await fetch(`${API_BASE}/ventas?${params.toString()}`, { headers });

  // Fallback si 404/405/Not acceptable -> /reportes/ventas
  if (!resp.ok && [404, 405, 406].includes(resp.status)) {
    resp = await fetch(`${API_BASE}/reportes/ventas?${params.toString()}`, { headers });
  }

  if (!resp.ok) {
    const text = await safeText(resp);
    throw new Error(`Error consultando ventas (${resp.status}): ${text}`);
  }

  const raw = (await resp.json()) as any;

  const items: Venta[] = (raw.items ?? raw.data ?? []).map((v: any) => ({
    id: String(v.id),
    fecha: v.fecha,
    sucursal: v.sucursal ?? v.sucursalNombre ?? "",
    vendedor: v.vendedor ?? v.vendedorNombre ?? "",
    producto: v.producto ?? v.descripcion ?? "",
    cantidad: typeof v.cantidad === "number" ? v.cantidad : textoAMonedaSeguro(String(v.cantidad)),
    precioUnitario:
      typeof v.precioUnitario === "number"
        ? v.precioUnitario
        : textoAMonedaSeguro(String(v.precioUnitario ?? v.precio_unitario)),
    total:
      typeof v.total === "number" ? v.total : textoAMonedaSeguro(String(v.total ?? v.montoTotal)),
  }));

  const r: RespuestaVentas = {
    items,
    totalItems: Number(raw.totalItems ?? raw.total ?? items.length) || items.length,
    totalPaginas: Number(raw.totalPaginas ?? raw.pages ?? 1) || 1,
    sumatoria: {
      cantidad: Number(raw.sumatoria?.cantidad) || sumar(items, x => x.cantidad),
      total: Number(raw.sumatoria?.total) || sumar(items, x => x.total),
    },
  };

  return r;
}