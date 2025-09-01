import { chromium, test, expect } from '@playwright/test'
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';

test('reporte de ventas', async ({ request }) => {
    const userDataDir = './context/chromium';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
    });
    const page = await context.newPage();
    await page.goto(`${process.env.APP_URL}/reportes/ventas`);

    if (page.url().includes('sign-in')) {
        login(page);
    }

    await page.waitForSelector('.tabulator-row');
    await page.locator('.animacion-carga').waitFor({ state: 'detached', timeout: 75000 });

    // Extraer los datos de cada fila
    const tableData = await page.$$eval('.tabulator-row', rows =>
        rows.map(row => {
            const cells = Array.from(row.querySelectorAll('.tabulator-cell'));
            return Object.fromEntries(
                cells.map(cell => [cell.getAttribute('tabulator-field')!, cell.textContent?.trim()])
            );
        })
    );

    const accessToken = await getAccessToken();
    const response = await request.post(`${process.env.API_URL}/api/queries/exec/26`, {
        headers: {
            accessToken,
            'Content-Type': 'application/json'
        },
        data: {
            "fechaMin": "2025-08-01",
            "fechaMax": "2025-08-31",
            "currentPage": 1,
            "pageSize": 20,
            "sort": []
        },
    });

    const backendData = await response.json();

    const normalizadoDOM = tableData.filter(item=>item.idFactura!=='').map(normalizarFila);
    const normalizadoBackend = backendData.data.data.map(normalizarFila);

    expect(normalizadoDOM).toEqual(normalizadoBackend);
});

function normalizarValor(v: string | null) {
    if (!v) return ''; // si viene vacío en front

    // limpiar símbolos $, %, comas y espacios
    const limpio = v.replace(/[$,%\s]/g, '').replace(/,/g, '');

    // intentar parsear a número
    const num = Number(limpio);
    if (!isNaN(num)) {
        return Number(num.toFixed(1)); // comparar como número
    }
    return v.trim(); // si no es número, devolver string plano
}

function normalizarFila(fila: Record<string, any>) {
    return Object.fromEntries(
        Object.entries(fila).map(([k, v]) => [k, normalizarValor(v as string)])
    );
}
