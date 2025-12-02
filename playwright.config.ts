import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Carga las variables del archivo .env de forma segura.
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Archivo de configuración principal para Playwright.
 * Incluye:
 * - Reporte HTML
 * - Reporte JSON para métricas
 * - Reporte Allure para defensa
 * - Evidencia (screenshots, videos, trazas)
 * - Configuración de CI/CD
 */
export default defineConfig({
  // Carpeta donde se ubican todos los tests.
  testDir: './tests',

  // Ejecuta tests en paralelo para reducir el tiempo total de ejecución.
  fullyParallel: true,

  // Previene que tests con ".only" se ejecuten accidentalmente en CI.
  forbidOnly: !!process.env.CI,

  // Configura reintentos exclusivamente para CI.
  retries: process.env.CI ? 2 : 0,

  // Número de workers para paralelismo. En CI se usa uno para estabilidad.
  workers: process.env.CI ? 1 : 1,

  /**
   * Reporters utilizados para generar resultados.
   * Incluye:
   * - HTML (para revisar evidencias visualmente)
   * - JSON (para métricas y estadísticas)
   * - Allure (para reportes profesionales)
   */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reporte-playwright.json' }],
    ['allure-playwright']
  ],

  /**
   * Configuración aplicable a todos los navegadores y proyectos.
   * Aquí se definen:
   * - Screenshots
   * - Videos
   * - Trazas (trace viewer)
   */
  use: {
    // Captura screenshots solo cuando un test falla.
    screenshot: 'only-on-failure',

    // Guarda un video de cada test fallido (útil para defensa).
    video: 'retain-on-failure',

    // Almacena trazas completas si un test falla y se reintenta.
    trace: 'retain-on-failure',

    // Tiempo máximo por cada acción (clic, fill, etc.).
    actionTimeout: 15000,

    // Tiempo máximo por cada test individual.
    navigationTimeout: 30000
  },

  /**
   * Navegadores donde se ejecutarán los tests.
   * Para defensa, lo recomendable es Chromium con UI visible.
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: false // Modo visible para observar la ejecución real.
      }
    }

    /*
    Se pueden habilitar otros navegadores si se requiere comparar compatibilidad:

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  /**
   * Permite iniciar un servidor antes de comenzar los tests.
   * Usado en proyectos donde la app se levanta con "npm start".
   * Está comentado porque no aplica a tu arquitectura actual.
   */
  /*
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  },
  */
});
