# Pruebas Dashboard Clientes

Este directorio contiene las pruebas automatizadas para la pantalla `/dashboard/clientes` usando Playwright y el patrón Page Object Model (POM).

## 📁 Estructura

```
dashboard-clientes/
├── pages/
│   └── DashboardClientesPage.ts    # Page Object Model
├── e2e/
│   ├── dashboard-clientes-ui.spec.ts   # Pruebas E2E Frontend (CP-68 a CP-82)
│   └── dashboard-clientes-api.spec.ts  # Pruebas API/Integración (CP-22 a CP-36)
└── README.md
```

## 🧪 Casos de Prueba

### Pruebas E2E Frontend (15 pruebas)
- **CP-68**: Validación de tarjeta de información general del cliente
- **CP-69**: Validación de tarjeta de información de contacto del cliente
- **CP-70**: Validación de tarjeta de notas del cliente
- **CP-71**: Validación de tarjeta de ventas totales del cliente
- **CP-72**: Validación de período medio de pago
- **CP-73**: Validación de monto de pago pendiente
- **CP-74**: Validación de tarjeta de morosidad
- **CP-75**: Validación de tarjeta de clasificación crediticia
- **CP-76**: Validación de tabla de clasificación por volumen de ventas
- **CP-77**: Validación de gráfico de cartera de crédito/contado
- **CP-78**: Validación de gráfico de límite crediticio
- **CP-79**: Validación de tarjeta de ticket promedio del cliente
- **CP-80**: Validación de tarjeta de frecuencia de compra
- **CP-81**: Validación de tabla de recomendación de productos
- **CP-82**: Validación de tabla de estado de cuenta

### Pruebas API/Integración (15 pruebas)
- **CP-22**: Prueba de api de información general cliente
- **CP-23**: Prueba de api de información de contacto del cliente
- **CP-24**: Prueba de api de notas cliente
- **CP-25**: Prueba de api de ventas totales de cliente
- **CP-26**: Prueba de api de período medio de pago
- **CP-27**: Prueba de api de monto pendiente
- **CP-28**: Prueba de api de morosidad de cliente
- **CP-29**: Prueba de api de clasificación crediticia de cliente
- **CP-30**: Prueba de api de clasificación volumétrica de cliente
- **CP-31**: Prueba de api de cartera crédito/contado
- **CP-32**: Prueba de api de límite crediticio
- **CP-33**: Prueba de api de ticket promedio
- **CP-34**: Prueba de api de frecuencia de compra
- **CP-35**: Prueba de api de recomendación de productos
- **CP-36**: Prueba de api de estado de cuenta

## 🚀 Ejecución

### Ejecutar todas las pruebas E2E
```bash
npx playwright test tests/front-end/dashboard-clientes/e2e/dashboard-clientes-ui.spec.ts
```

### Ejecutar todas las pruebas API
```bash
npx playwright test tests/front-end/dashboard-clientes/e2e/dashboard-clientes-api.spec.ts
```

### Ejecutar una prueba específica
```bash
npx playwright test -g "CP-68"
```

## ⚙️ Configuración

### Variables de Entorno Requeridas
- `BASE_URL` o `APP_URL`: URL base de la aplicación
- `API_URL`: URL base de la API (para pruebas API)
- `EMAIL`: Email para login
- `PASSWORD`: Contraseña para login

### Cliente de Prueba
Por defecto, las pruebas usan el cliente **"Adrián Castillo"**. Puedes modificarlo en los archivos de prueba si es necesario.

## 📝 Notas Importantes

### Pruebas API
⚠️ **Las pruebas de API necesitan los IDs reales de los endpoints**. Actualmente usan placeholders `[ID]` que deben ser reemplazados con los IDs reales de las queries en tu API.

Para encontrar los IDs correctos:
1. Revisa la configuración de la pantalla en `datalysis-app/src/app/[locale]/dynamic_components/data/demo/clientes/`
2. Identifica los endpoints usados en cada componente
3. Reemplaza `[ID]` en `dashboard-clientes-api.spec.ts` con los IDs reales

### Page Object Model
El `DashboardClientesPage` encapsula todas las interacciones con la página:
- Navegación y carga
- Filtros (fecha, nombre cliente)
- Lectura de tarjetas de información
- Acceso a gráficos y tablas

### Selectores
Los selectores usan múltiples estrategias para mayor robustez:
- `data-testid` (preferido)
- Texto visible
- Roles ARIA
- Selectores CSS con fallbacks

## 🔧 Mantenimiento

Si la estructura de la página cambia:
1. Actualiza los selectores en `DashboardClientesPage.ts`
2. Los métodos públicos del POM se mantienen, solo cambia la implementación interna
3. Las pruebas no necesitan cambios si los métodos públicos siguen iguales

## 📊 Cobertura

Estas pruebas cubren:
- ✅ Validación de datos mostrados en UI
- ✅ Validación de respuestas de API
- ✅ Interacción con filtros
- ✅ Renderizado de gráficos y tablas
- ✅ Actualización de datos al cambiar filtros

