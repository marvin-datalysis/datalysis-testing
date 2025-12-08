import { chromium, test, expect } from '@playwright/test'
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';
import { queryDBAnalytic } from '../../../utils/dbAnalytic';
import { reporteCuentasPorCobrarQuery } from './queries/reporteCuentasPorCobrarQuery';

test('reporte de ventas', async ({ request }) => {
    test.setTimeout(60000)
    const userDataDir = './context/chromium';
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
    });
    const page = await context.newPage();
    await page.goto(`${process.env.APP_URL}/dashboard/clientes`);

    if (page.url().includes('sign-in')) {
        login(page,false);
    }

    await page.waitForSelector('.tabulator-row',{timeout:60000});
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
    const response = await request.post(`${process.env.API_URL}/api/queries/exec/120`, {
        headers: {
            accessToken,
            'Content-Type': 'application/json'
        },
        data: {
            "nombreCliente":["Adrián Castillo"],"correoEmpleado":"tesinaQA@datalysisgroup.com","fechaMin":"2023-01-01","fechaMax":"2025-12-07","currentPage":1,"pageSize":15,"sort":[]
        },
    });

    const backendData = await response.json();

    const normalizadoDOM = tableData.filter(item=>item.idFactura!=='').map(normalizarFila);
    //const normalizadoBackend = backendData.data.data.map(normalizarFila);
    let normalizadoBackend= await queryDBAnalytic(reporteCuentasPorCobrarQuery,['Adrián Castillo'])
    normalizadoBackend = normalizadoBackend.map(normalizarFila);

    for (let i=0;i<normalizadoDOM.length;i++){
        if(JSON.stringify(normalizadoDOM[i])!==JSON.stringify(normalizadoBackend[i])){
            console.log(normalizadoDOM[i],normalizadoBackend[i],1)
        }
    }
    expect(normalizadoDOM).toEqual(normalizadoBackend);
});

function normalizarValor(v: string | null) {
    if (!v) return ''; // si viene vacío en front
    v = v.toString();

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
        Object.entries(fila).map(([k, v]) => [k, (k==='saldoPendiente'&&!v)?0:normalizarValor(v as string)])
    );
}
