// CPM-13: Validación de la tabla de Reporte de Ventas contra backend
import { test, expect } from '@playwright/test';
import ReporteVentasPage from '../pages/ReporteVentasPage';
import { FilaVenta, construirClave } from '../fixtures/modelo-ventas';
import { consultarVentas, mapearFilaApi } from '../../../../utils/api';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
//const CSRF = process.env.CSRF_TOKEN;

function ordenarPorClave(a: FilaVenta, b: FilaVenta) {
  return a.claveFila.localeCompare(b.claveFila);
}

test.describe('Reporte de Ventas - CPM-13', () => {
  test('La tabla renderiza y coincide con backend', async ({ page, request }) => {
    const reporte = new ReporteVentasPage(page);

    // 1) Navegación
    await reporte.ir(BASE);
    // assertin para ver que la URL contiene /reportes/ventas (ajusta si tu ruta es distinta)
    await expect(page).toHaveURL(/reportes\/ventas/i);
    await reporte.esperarLista();

    // 2) UI
    const headers = await reporte.obtenerEncabezados();
    expect(headers.length).toBeGreaterThan(0);

    const filasUiRaw = await reporte.obtenerTodasLasFilas();
    const filasUi: FilaVenta[] = filasUiRaw.map((celdas) => {
      const [
        idFactura,
        fecha,
        nombreProducto,
        nombreCategoria,
        empresa,
        numeroSucursal,
        nombreEmpleado,
        condicionPago,
        cantidadTxt,
        precioTxt,
        costoTxt,
        descUsdTxt,
        descPctTxt,
        margenUsdTxt,
        margenPctTxt,
      ] = celdas;

      const cantidad = Number(cantidadTxt?.replace(/[^\d.-]/g, '') || 0);
      const precioUnitario = Number(precioTxt?.replace(/[^\d.-]/g, '') || 0);
      const costoUnitario = Number(costoTxt?.replace(/[^\d.-]/g, '') || 0);
      const descuentoUSD = Number(descUsdTxt?.replace(/[^\d.-]/g, '') || 0);
      const descuentoPct = Number(String(descPctTxt).replace('%', '').trim() || 0);
      const margenUSD = Number(margenUsdTxt?.replace(/[^\d.-]/g, '') || 0);
      const margenPct = Number(String(margenPctTxt).replace('%', '').trim() || 0);

      const idProducto = '';
      const claveFila = construirClave(String(idFactura), idProducto, String(nombreProducto));

      return {
        idFactura: String(idFactura ?? ''),
        idProducto,
        claveFila,
        nombreProducto: String(nombreProducto ?? ''),
        nombreCategoria: String(nombreCategoria ?? ''),
        nombreCliente: '',
        empresa: String(empresa ?? ''),
        numeroSucursal: String(numeroSucursal ?? ''),
        nombreEmpleado: String(nombreEmpleado ?? ''),
        condicionPago: String(condicionPago ?? ''),
        fecha: String(fecha ?? ''),
        cantidad,
        precioUnitario,
        costoUnitario,
        descuentoUSD,
        descuentoPct,
        margenUSD,
        margenPct,
      };
    });

    // 3) API
    const filasApiRaw = await consultarVentas(request, process.env.API_URL, {});
    const filasApi = filasApiRaw.map(mapearFilaApi);

    filasUi.sort(ordenarPorClave);
    filasApi.sort(ordenarPorClave);

    // 4) Comparación
    expect(filasUi.length).toBe(filasApi.length);

    const clavesUi = new Set(filasUi.map((r) => r.claveFila));
    const clavesApi = new Set(filasApi.map((r) => r.claveFila));
    expect(clavesUi).toEqual(clavesApi);

    for (let i = 0; i < filasUi.length; i++) {
      const U = filasUi[i];
      const A = filasApi[i];

      expect(U.claveFila).toBe(A.claveFila);
      expect(U.nombreProducto).toContain(A.nombreProducto);
      expect(U.empresa).toBe(A.empresa);
      expect(U.numeroSucursal).toBe(A.numeroSucursal);
      expect(U.nombreEmpleado).toBe(A.nombreEmpleado);
      expect(U.condicionPago.toLowerCase()).toBe(A.condicionPago.toLowerCase());

      expect(Math.abs(U.precioUnitario - A.precioUnitario)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(U.costoUnitario - A.costoUnitario)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(U.descuentoUSD - A.descuentoUSD)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(U.margenUSD - A.margenUSD)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(U.descuentoPct - A.descuentoPct)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(U.margenPct - A.margenPct)).toBeLessThanOrEqual(0.1);
    }
  });
});