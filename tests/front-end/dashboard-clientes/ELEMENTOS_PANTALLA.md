# Elementos de la Pantalla `/dashboard/clientes`

## Índice
- [Filtros](#filtros)
- [Tarjetas de Información](#tarjetas-de-información)
- [Gráficos](#gráficos)
- [Tablas](#tablas)
- [Estados y Mensajes](#estados-y-mensajes)

---

## Filtros

### Selector de Rango de Fechas
- **Selector principal**: `[data-slot="input-field"]` (primer elemento)
- **Segmentos de fecha** (HeroUI/React Aria):
  - Año inicio: `[data-type="year"][role="spinbutton"]` (índice 0)
  - Mes inicio: `[data-type="month"][role="spinbutton"]` (índice 0)
  - Día inicio: `[data-type="day"][role="spinbutton"]` (índice 0)
  - Año fin: `[data-type="year"][role="spinbutton"]` (índice 1)
  - Mes fin: `[data-type="month"][role="spinbutton"]` (índice 1)
  - Día fin: `[data-type="day"][role="spinbutton"]` (índice 1)
- **Botón OK del popover**: `button[name=/^ok$/i]` (primer elemento)

### Filtro de Cliente
- **Input por label**: `getByLabel(/cliente|nombre.*cliente/i)`
- **Input por placeholder**: `input[placeholder*="cliente" i], input[name*="cliente" i]`
- **Opciones**: `getByRole("option", { name: /nombre-cliente/i })`

### Botón Filtrar
- **Selector**: `getByRole("button", { name: /filtrar|buscar|aplicar/i })` (primer elemento)

---

## Tarjetas de Información

### Tarjeta de Información General
- **Selector 1**: `[data-testid*="client-info"], [data-testid*="info-general"]`
- **Selector 2**: `text=/información.*general/i` → `locator('..')` → `locator('..')`
- **Método POM**: `getInfoGeneral()` - retorna string con el contenido

### Tarjeta de Información de Contacto
- **Selector 1**: `[data-testid*="contact"], [data-testid*="contacto"]`
- **Selector 2**: `text=/contacto/i` → `locator('..')` → `locator('..')`
- **Método POM**: `getInfoContacto()` - retorna string con teléfono, email, dirección
- **Campos esperados**: teléfono, email, dirección

### Tarjeta de Notas
- **Selector 1**: `[data-testid*="nota"], [data-testid*="note"]`
- **Selector 2**: `text=/nota/i` → `locator('..')` → `locator('..')`
- **Método POM**: `getNotas()` - retorna string con las notas

### Tarjeta de Ventas Totales
- **Selector**: `text=/ventas.*total/i` → `locator('..')` → `locator('strong, span, b, [class*="value"], [class*="amount"]')`
- **Método POM**: `getVentasTotales()` - retorna number
- **Formato**: Valor monetario

### Tarjeta de Período Medio de Pago
- **Selector**: `text=/período.*medio|periodo.*pago|días.*promedio/i` → `locator('..')` → `locator('strong, span, b, [class*="value"]')`
- **Método POM**: `getPeriodoMedioPago()` - retorna number (días)
- **Formato**: Número de días

### Tarjeta de Monto Pendiente
- **Selector**: `text=/pendiente|saldo.*pendiente|monto.*pendiente/i` → `locator('..')` → `locator('strong, span, b, [class*="value"], [class*="amount"]')`
- **Método POM**: `getMontoPendiente()` - retorna number
- **Formato**: Valor monetario

### Tarjeta de Morosidad
- **Selector**: `text=/morosidad|días.*vencido|vencimiento/i` → `locator('..')` → `locator('..')`
- **Método POM**: `getMorosidad()` - retorna string
- **Contenido**: Información sobre días vencidos, facturas pendientes

### Tarjeta de Clasificación Crediticia
- **Selector**: `text=/clasificación.*credit|segmento|rating/i` → `locator('..')` → `locator('strong, span, b, [class*="badge"], [class*="tag"]')`
- **Método POM**: `getClasificacionCrediticia()` - retorna string
- **Valores posibles**: Oro, Plata, Bronce, etc.

### Tarjeta de Ticket Promedio
- **Selector**: `text=/ticket.*promedio|promedio.*ticket/i` → `locator('..')` → `locator('strong, span, b, [class*="value"]')`
- **Método POM**: `getTicketPromedio()` - retorna number
- **Formato**: Valor monetario

### Tarjeta de Frecuencia de Compra
- **Selector**: `text=/frecuencia.*compra|frecuencia.*días/i` → `locator('..')` → `locator('strong, span, b, [class*="value"]')`
- **Método POM**: `getFrecuenciaCompra()` - retorna number (días)
- **Formato**: Número de días entre compras

---

## Gráficos

### Gráfico de Cartera Crédito/Contado
- **Selector 1**: `[data-testid*="cartera"], [data-testid*="credito-contado"]`
- **Selector 2**: `text=/crédito.*contado|contado.*crédito/i` → `locator('..')` → `locator('..')`
- **Método POM**: `graficoCarteraCreditoContado()` - retorna Locator
- **Tipo**: Gráfico que muestra distribución de ventas a crédito vs contado

### Gráfico de Límite Crediticio
- **Selector 1**: `[data-testid*="limite-credito"], [data-testid*="credit-limit"]`
- **Selector 2**: `text=/límite.*crédito|limite.*credito/i` → `locator('..')` → `locator('..')`
- **Método POM**: `graficoLimiteCrediticio()` - retorna Locator
- **Tipo**: Gráfico que muestra límite de crédito y consumo actual

---

## Tablas

### Tabla de Clasificación por Volumen
- **Selector 1**: `[data-testid*="clasificacion-volumen"], [data-testid*="volume-classification"]`
- **Selector 2**: `text=/clasificación.*volumen|volumen.*ventas/i` → `locator('..')` → `locator('.tabulator')`
- **Método POM**: `getTablaClasificacionVolumen()` - retorna Locator
- **Contenido**: Clientes clasificados por volumen de ventas

### Tabla de Recomendación de Productos
- **Selector 1**: `[data-testid*="recomendacion"], [data-testid*="recommendation"]`
- **Selector 2**: `text=/recomendación.*producto|producto.*recomendado/i` → `locator('..')` → `locator('.tabulator')`
- **Método POM**: `getTablaRecomendacionProductos()` - retorna Locator
- **Contenido**: Productos recomendados según histórico del cliente

### Tabla de Estado de Cuenta
- **Selector 1**: `[data-testid*="estado-cuenta"], [data-testid*="account-statement"]`
- **Selector 2**: `text=/estado.*cuenta|cuenta.*cliente/i` → `locator('..')` → `locator('.tabulator')`
- **Método POM**: `getTablaEstadoCuenta()` - retorna Locator
- **Contenido**: Movimientos, facturas pendientes y canceladas, saldos

### Filas de Tablas
- **Selector**: `.tabulator-row` (dentro de cada tabla)
- **Método POM**: `getFilasTabla(tabla)` - retorna number de filas

---

## Estados y Mensajes

### Animación de Carga
- **Selector**: `.animacion-carga`
- **Uso**: Esperar hasta que esté `detached`

### Estado Vacío
- **Selector**: `text=/sin resultados|no se encontraron|no hay datos/i`

---

## Identificadores de API/Data

### IDs de Componentes (según configuración dinámica)
- **Layout**: `clientesLayout`
- **Tipo**: `layoutOne`
- **Inicializadores**:
  - `minDate2` → mapea a `fechaMin`
  - `maxDate` → mapea a `fechaMax`
  - `nombreCliente` → mapea a `nombreCliente`
  - `correoEmpleado` → mapea a `correoEmpleado`

### Containers
1. `filters_container` - Filtros
2. `client_info_container` - Información del cliente
3. `comparison_cards_container` - Tarjetas de comparación
4. `grupos_cliente_container` - Grupos de clientes
5. `graficos_ventas_credito_cliente_container` - Gráficos de crédito
6. `grafico_ventas_container` - Gráfico de ventas
7. `graficos_top_ventas_producto_categoria_container` - Top ventas
8. `sistema_recomendacion_container` - Sistema de recomendación
9. `table_container` - Tabla principal

### Endpoints de API (según Excel)
Los endpoints específicos deben ser identificados en la configuración de cada componente.

---

## Notas de Implementación

### Selectores Robustos
- Múltiples fallbacks para cada elemento
- Uso de `data-testid` cuando está disponible
- Expresiones regulares para matching flexible
- Navegación por DOM relativo (`locator('..')`)

### Timeouts Recomendados
- Carga inicial: 120,000ms (2 minutos)
- Espera de elementos: 30,000ms
- Animación de carga: 75,000ms

---

## Uso en Tests

Todos estos elementos están encapsulados en el Page Object Model:
- **Archivo**: `tests/front-end/dashboard-clientes/pages/DashboardClientesPage.ts`
- **Clase**: `DashboardClientesPage`

### Ejemplo de uso:

```typescript
import DashboardClientesPage from '../pages/DashboardClientesPage';

test('Mi prueba', async ({ page }) => {
  const dashboard = new DashboardClientesPage(page);
  
  await dashboard.ir(BASE_URL);
  await dashboard.esperarCarga();
  await dashboard.setNombreCliente('Adrián Castillo');
  await dashboard.clickFiltrar();
  
  const ventas = await dashboard.getVentasTotales();
  expect(ventas).toBeGreaterThan(0);
});
```

---

## Casos de Prueba Cubiertos

### Pruebas E2E Frontend (CP-68 a CP-82)
- CP-68: Información general
- CP-69: Información de contacto
- CP-70: Notas del cliente
- CP-71: Ventas totales
- CP-72: Período medio de pago
- CP-73: Monto pendiente
- CP-74: Morosidad
- CP-75: Clasificación crediticia
- CP-76: Tabla clasificación por volumen
- CP-77: Gráfico cartera crédito/contado
- CP-78: Gráfico límite crediticio
- CP-79: Ticket promedio
- CP-80: Frecuencia de compra
- CP-81: Tabla recomendación productos
- CP-82: Tabla estado de cuenta

### Pruebas API (CP-22 a CP-36)
Ver archivo `dashboard-clientes-api.spec.ts`

