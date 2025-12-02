# Datalysis Testing - Documentación Técnica

Proyecto de automatización de pruebas E2E y API para la plataforma **Datalysis** utilizando **Playwright** como framework principal.

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Requisitos Previos](#requisitos-previos)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Variables de Entorno](#variables-de-entorno)
6. [Ejecutar Pruebas](#ejecutar-pruebas)
7. [Patrones de Pruebas](#patrones-de-pruebas)
8. [Agregar Nuevas Pruebas](#agregar-nuevas-pruebas)
9. [Reportes y Evidencia](#reportes-y-evidencia)
10. [Estructura de Directorios Detallada](#estructura-de-directorios-detallada)

---

## 🎯 Descripción General

Este proyecto automatiza pruebas funcionales para validar:

- **Front-end (E2E)**: Interacción con UI, validación de KPIs, reportes y dashboards
- **API**: Consultas backend, validación de datos, consistencia entre UI y API
- **Base de Datos**: Conexión y validación de datos persistidos

### Tecnologías

- **Framework**: Playwright v1.52.0
- **Lenguaje**: TypeScript
- **Reportes**: HTML, JSON, Allure
- **CI/CD Compatible**: Soporta ejecución en pipelines
- **Node.js**: ^18.0.0

---

## 📁 Estructura del Proyecto

```
datalysis-testing/
├── tests/
│   ├── api/
│   │   ├── db-connection.spec.ts          # Pruebas de conexión BD
│   │   ├── ...                            # Resto de pruebas
│   │   └── seguridad/
│   │       ├── seguridad.api.ts           # Helpers API seguridad
│   │       └── seguridad.spec.ts          # Pruebas seguridad API
│   ├── front-end/
│   │   ├── inicio/
│   │   │   ├── inicio.interface.ts        # Tipos de respuesta
│   │   │   └── inicio.spec.ts             # Pruebas dashboard inicio
│   │   ├── reporte-ventas/
│   │   │   └── reporte-ventas.spec.ts     # Validación reportes
│   │   ├── resumen-ejecutivo/
│   │   │   ├── resumen-ejecutivo.spec.ts  # Pruebas KPIs
│   │   │   └── pages/
│   │   │       └── resumenEjecutivo.page.ts
│   │   └── Seguridad/
│   │       ├── Login/
│   │       │   ├── seguridad-login.spec.ts
│   │       │   └── pages/
│   │       │       └── login.page.ts
│   │       ├── Roles/
│   │       │   ├── roles.spec.ts
│   │       │   └── pages/
│   │       │       └── roles.page.ts
│   │       └── Usuario/
│   │           ├── usuarios.spec.ts
│   │           └── pages/
│   │               └── users.page.ts
├── utils/
│   ├── db.ts                              # Conexión PostgreSQL
│   ├── getToken.ts                        # Obtención de tokens
│   ├── login.ts                           # Función de login
│   └── token.json                         # Almacenamiento tokens
├── context/
│   └── chromium/                          # Contextos persistentes
├── playwright.config.ts                   # Configuración Playwright
├── package.json                           # Dependencias y scripts
├── .env                                   # Variables de entorno (NO COMMITEAR)
├── .gitignore                             # Archivos a ignorar
├── allure-report/                         # Reportes Allure generados
├── allure-results/                        # Resultados Allure (raw)
├── playwright-report/                     # Reportes HTML Playwright
├── test-results/                          # Resultados última ejecución
└── reporte-playwright.json                # Reporte JSON

```

---

## ⚙️ Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Acceso a la API**: URL y credenciales válidas
- **Base de Datos**: PostgreSQL

---

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <url del repositorio>
cd datalysis-testing
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Instalar Navegadores Playwright

```bash
npx playwright install
```

### 4. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

---

## 🔐 Variables de Entorno

Archivo `.env` (ejemplo):

```env
# URL de la Aplicación
APP_URL=

# URL de la API
API_URL=

# Credenciales de Prueba
TEST_EMAIL=
TEST_PASSWORD=

# Base de Datos
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

**⚠️ Importante**: NO commitear `.env` con datos sensibles. Usar `.env.example` para referencia.

---

## ▶️ Ejecutar Pruebas

### Ejecutar Todas las Pruebas

```bash
npm test
```

### Ejecutar Pruebas Específicas

```bash
# Solo pruebas de front-end
npx playwright test tests/front-end

# Solo API
npx playwright test tests/api

# Un archivo específico
npx playwright test tests/front-end/inicio/inicio.spec.ts

# Por patrón
npx playwright test --grep "reporte"
```

### Ejecutar con Diferentes Modos

```bash
# Modo headless (sin UI)
npx playwright test --headed=false

# Modo visible (con UI)
npx playwright test --headed

# Debug interactivo
npx playwright test --debug

# Modo watch (reinicia al cambiar archivos)
npx playwright test --watch
```

### Ejecutar en CI/CD

```bash
CI=true npm test
```

Automáticamente:
- Usa 1 worker en lugar de paralelo
- Reintenta 2 veces si falla
- Genera reportes
- Prohíbe `.only` en tests

---

## 🧪 Patrones de Pruebas

### 1. Estructura General de una Prueba

```typescript
import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';

test.describe('Nombre del Módulo', () => {
  test('Descripción clara del caso', async ({ page, request }) => {
    // Arrange: Preparar datos
    const userDataDir = './context/chromium';
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
    });
    const page = await context.newPage();

    // Act: Ejecutar acciones
    await page.goto(`${process.env.APP_URL}`);
    if (page.url().includes('sign-in')) {
      await login(page);
    }

    // Assert: Validar resultados
    await expect(page.locator('.elemento')).toBeVisible();
  });
});
```

### 2. Patrón: Page Object Model (POM)

**Archivo**: `tests/front-end/Seguridad/Login/pages/login.page.ts`

```typescript
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${process.env.APP_URL}/es/auth/sign-in`);
  }

  async fillEmail(email: string) {
    await this.page.locator('#email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.locator('#password').fill(password);
  }

  async clickLoginButton() {
    await this.page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
    await this.page.waitForNavigation();
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }
}
```

**Uso en test**:

```typescript
import { LoginPage } from './pages/login.page';

test('Login exitoso', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('user@example.com', 'password123');
  await expect(page).toHaveURL(/dashboard/);
});
```

### 3. Patrón: Validación UI vs API

Ver archivo: [`tests/front-end/inicio/inicio.spec.ts`](tests/front-end/inicio/inicio.spec.ts)

```typescript
// Extraer dato de UI
const valorUI = await page.locator('#ventas-totales').innerHTML();

// Obtener token
const accessToken = await getAccessToken();

// Llamar API
const response = await request.post(`${process.env.API_URL}/api/queries/exec/6`, {
  headers: { accessToken },
  data: { datePeriod: 'month' },
});

const dataAPI = await response.json();

// Comparar
expect(Number(valorUI)).toBe(Number(dataAPI.data.ventas));
```

### 4. Patrón: Validación de Tablas

Ver archivo: [`tests/front-end/reporte-ventas/reporte-ventas.spec.ts`](tests/front-end/reporte-ventas/reporte-ventas.spec.ts)

```typescript
// Extraer datos de tabla DOM
const tableData = await page.$$eval('.tabulator-row', rows =>
  rows.map(row => {
    const cells = Array.from(row.querySelectorAll('.tabulator-cell'));
    return Object.fromEntries(
      cells.map(cell => [
        cell.getAttribute('tabulator-field'),
        cell.textContent?.trim()
      ])
    );
  })
);

// Normalizar valores
const normalizadoDOM = tableData.map(normalizarFila);
const normalizadoBackend = backendData.data.data.map(normalizarFila);

// Comparar
expect(normalizadoDOM).toEqual(normalizadoBackend);
```

### 5. Patrón: Tolerancia en KPIs

Ver archivo: [`tests/front-end/resumen-ejecutivo/resumen-ejecutivo.spec.ts`](tests/front-end/resumen-ejecutivo/resumen-ejecutivo.spec.ts)

```typescript
function validarConTolerancia(valorUI: number, valorAPI: number, tolerancia: number = 0.05) {
  const diff = Math.abs(valorUI - valorAPI);
  const toleranciaAbsoluta = Math.abs(valorAPI * tolerancia);
  
  expect(diff).toBeLessThanOrEqual(toleranciaAbsoluta);
}

// Uso
validarConTolerancia(3452934, 125398375, 0.05); // 5% tolerancia
```

---

## 🆕 Agregar Nuevas Pruebas

### Paso 1: Crear Archivo de Prueba

Ubicación: `tests/<tipo>/<modulo>/<feature>.spec.ts`

Ejemplo para nueva prueba de cartera:

```bash
mkdir -p tests/front-end/cartera
touch tests/front-end/cartera/cartera.spec.ts
```

### Paso 2: Escribir la Prueba

```typescript
// filepath: tests/front-end/cartera/cartera.spec.ts
import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import { login } from '../../../utils/login';
import { getAccessToken } from '../../../utils/getToken';

test.describe('Cartera', () => {
  test('Validar listado de clientes en cartera', async ({ page, request }) => {
    test.setTimeout(75000);
    
    const userDataDir = './context/chromium';
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
    });
    const page = await context.newPage();
    
    // Navegar y autenticar
    await page.goto(`${process.env.APP_URL}/dashboard/cartera`);
    if (page.url().includes('sign-in')) {
      await login(page);
    }

    // Esperar carga de datos
    await page.locator('.animacion-carga').waitFor({ state: 'detached', timeout: 75000 });

    // Validar elementos
    const titulo = page.locator('h1:has-text("Cartera")');
    await expect(titulo).toBeVisible();

    // Llamar API para comparar
    const accessToken = await getAccessToken();
    const response = await request.post(
      `${process.env.API_URL}/api/queries/exec/cartera-id`,
      {
        headers: { accessToken },
        data: {},
      }
    );
    
    const backendData = await response.json();
    expect(response.ok()).toBeTruthy();

    await context.close();
  });
});
```

### Paso 3: Crear Page Object (opcional pero recomendado)

```typescript
// filepath: tests/front-end/cartera/pages/cartera.page.ts
import { Page } from '@playwright/test';

export class CarteraPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${process.env.APP_URL}/dashboard/cartera`);
  }

  async getClientesCount() {
    return await this.page.locator('table tbody tr').count();
  }

  async searchCliente(nombre: string) {
    await this.page.locator('input#search').fill(nombre);
  }

  async filtrarPorEstado(estado: string) {
    await this.page.locator(`button#filtro-${estado}`).click();
  }
}
```

### Paso 4: Agregar Tipos (si es necesario)

```typescript
// filepath: tests/front-end/cartera/cartera.interface.ts
export interface CarteraResponse {
  data: {
    clientes: Array<{
      id: number;
      nombre: string;
      saldo: number;
      estado: string;
    }>;
  };
}
```

### Paso 5: Ejecutar la Prueba

```bash
npx playwright test tests/front-end/cartera/cartera.spec.ts
```

---

## 📊 Reportes y Evidencia

### Tipos de Reportes

#### 1. **Reporte HTML** (Local)
Generado automáticamente en `playwright-report/`

```bash
# Ver reporte (abre navegador)
npx playwright show-report
```

Incluye:
- Screenshots de fallos
- Videos de pruebas
- Trazas (trace) para debugging

#### 2. **Reporte Allure** (Profesional)

```bash
# Generar reporte Allure
allure generate allure-results --clean -o allure-report

# Servir reporte en navegador
allure open allure-report
```

Características:
- Histórico de ejecuciones
- Análisis de tendencias
- Integración con CI/CD
- Reportes por severidad

#### 3. **Reporte JSON** (Automatizado)

Archivo: `reporte-playwright.json`

Úsalo para:
- Integración con dashboards
- Alertas automáticas
- Métricas personalizadas

---

## 🔍 Debugging y Troubleshooting

### Debug Interactivo

```bash
npx playwright test --debug
```

Permite pausar, inspeccionar y retomar ejecución.

### Inspeccionar Selectores

```bash
npx playwright codegen http://localhost:3000
```

Genera código automáticamente al interactuar con la página.

### Ver Trazas

```bash
npx playwright show-trace test-results/trace.zip
```

### Logs Detallados

```bash
DEBUG=pw:api npx playwright test
```

---

## ✅ Mejores Prácticas

1. **Nombres Descriptivos**: `test('Validar que el KPI de ventas coincida con API', ...)`
2. **Timeouts Apropiados**: `test.setTimeout(75000)` para pruebas lentas
3. **Esperas Explícitas**: `waitFor()` en lugar de `sleep()`
4. **Localización Robusta**: Usar `getByRole()`, `getByText()` antes que CSS
5. **Datos de Prueba**: Usar variables de entorno, no hardcodear credenciales
6. **Page Objects**: Centralizar selectores en clases
7. **Comentarios**: Documentar lógica compleja
8. **Reutilización**: Funciones helper para acciones comunes

---

## 📝 Funciones Helper Disponibles

### `getAccessToken()` - Obtener Token JWT

```typescript
import { getAccessToken } from '../../../utils/getToken';

const token = await getAccessToken();
// Usa credenciales del .env para obtener token
```

### `login()` - Autenticar Usuario

```typescript
import { login } from '../../../utils/login';

await login(page);
// Autentica automáticamente usando credenciales
```

### `connectDatabase()` - Conexión BD

```typescript
import { connectDatabase } from '../../../utils/db';

const client = await connectDatabase();
const result = await client.query('SELECT * FROM usuario');
```

## 📚 Recursos Útiles

- [Documentación Playwright](https://playwright.dev)
- [Allure Report](https://docs.qameta.io/allure/)
- [Best Practices E2E](https://playwright.dev/docs/best-practices)
- [Selectors Playground](https://playwright.dev/docs/inspector)

---

## 👥 Contacto y Soporte

- **Issues**: Reportar en el repositorio
- **Documentación Local**: Ver comentarios en archivos `.spec.ts`
- **Configuración**: Ver `[playwright.config.ts](playwright.config.ts)`

---

**Versión Playwright**: 1.52.0  
**Versión Node.js**: >=18.0.0