import { test, expect, chromium, Page, APIRequestContext, request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getAccessToken } from '../../../utils/getToken';
import { login } from '../../../utils/login';

dotenv.config();

// Configuración de tarjetas Resumen Ejecutivo
const tarjetas = [
  { title: 'VENTAS TOTALES', queryId: 24, domId: 'ventas-totales-monto' },
  { title: 'COSTOS TOTALES', queryId: 21, domId: 'costos-totales-monto' },
  { title: 'MARGEN TOTAL', queryId: 23, domId: 'margen-total-monto' },
  { title: 'MARGEN %', queryId: 22, domId: 'margen-porcentual-monto' },
  { title: 'TICKET PROMEDIO', queryId: 25, domId: 'ticket-promedio-monto' },
  { title: 'TICKETS', queryId: 20, domId: 'tickets-monto' },
];

// 🔑 Mapear cada tarjeta a su clave real en summary
const metricKey: Record<string, string> = {
  'VENTAS TOTALES': 'ventas',
  'COSTOS TOTALES': 'costo',
  'MARGEN TOTAL': 'margenTotal',
  'MARGEN %': 'margenPorcentual',
  'TICKET PROMEDIO': 'ticketPromedio',
  'TICKETS': 'tickets',
};

// Normalización de valores
function normalizarValor(v: string | null) {
  if (!v) return '';
  const limpio = v.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const num = Number(limpio);
  if (!isNaN(num)) {
    return Number(num.toFixed(2));
  }
  return v.trim();
}

test.describe('Dashboard Resumen Ejecutivo', () => {
  let page: Page;

  test.describe.configure({ timeout: 180000 });

  test.beforeAll(async () => {
    const context = await chromium.launchPersistentContext('./context/chromium', {
      headless: false,
    });
    page = await context.newPage();

    await page.goto(`${process.env.APP_URL}/dashboard/resumen-ejecutivo`);

    if (page.url().includes('sign-in')) {
      await login(page);
    }

    await page.locator('.animacion-carga').waitFor({ state: 'detached', timeout: 120000 });
  });

  // Validar todas las tarjetas contra API
  for (const tarjeta of tarjetas) {
    test(`Validar tarjeta: ${tarjeta.title}`, async () => {
      const actual = page.locator(`#${tarjeta.domId}-Actual`);
      const anterior = page.locator(`#${tarjeta.domId}-Anterior`);
      const anioPasado = page.locator(`#${tarjeta.domId}-Año`);

      await expect(actual).toBeVisible({ timeout: 60000 });

      const valorActualHTML = await actual.innerText();
      const valorAnteriorHTML = await anterior.innerText();
      const valorAnioHTML = await anioPasado.innerText();

      // Crear nuevo contexto de request por cada test
      const apiRequest: APIRequestContext = await playwrightRequest.newContext();
      const accessToken = await getAccessToken();

      const response = await apiRequest.post(
        `${process.env.API_URL}/api/queries/exec/${tarjeta.queryId}`,
        {
          headers: {
            accessToken,
            'Content-Type': 'application/json',
          },
          data: {
            datePeriod: 'month',
            timeComparison: 'prior_period',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      await apiRequest.dispose();

      // 👉 Usamos la clave específica de la tarjeta
      const key = metricKey[tarjeta.title];

      const valorAnteriorApi = data.data?.summary?.firstPeriod?.[key];
      const valorActualApi = data.data?.summary?.secondPeriod?.[key];

      const actualUI = normalizarValor(valorActualHTML);
      const anteriorUI = normalizarValor(valorAnteriorHTML);

      // ✅ Solo comparamos si API devolvió número válido
      if (typeof valorActualApi === 'number') {
        await expect(actualUI).toBeCloseTo(valorActualApi, 1);
      } else {
        expect(!isNaN(Number(actualUI))).toBeTruthy();
      }

      if (typeof valorAnteriorApi === 'number') {
        await expect(anteriorUI).toBeCloseTo(valorAnteriorApi, 1);
      } else {
        expect(!isNaN(Number(anteriorUI))).toBeTruthy();
      }

      // Año pasado → validamos numérico
      expect(!isNaN(Number(normalizarValor(valorAnioHTML)))).toBeTruthy();
    });
  }

  // Validar filtros de fechas
  test('Aplicar filtros de fecha', async () => {
    const inicio = page.getByText('Inicio').locator('..').locator('input');
    const fin = page.getByText('Fin').locator('..').locator('input');

    await expect(inicio).toBeVisible();
    await expect(fin).toBeVisible();

    await inicio.fill('2025-08-01');
    await fin.fill('2025-08-31');

    const aplicar = page.getByRole('button', { name: /aplicar|filtrar|actualizar/i });
    if (await aplicar.isVisible()) {
      await aplicar.click();
    }

    await page.locator('.animacion-carga').waitFor({ state: 'detached', timeout: 120000 });

    for (const tarjeta of tarjetas) {
      const actual = page.locator(`#${tarjeta.domId}-Actual`);
      await expect(actual).toBeVisible();
    }
  });
});
