export const reporteCuentasPorCobrarQuery = `
WITH limits AS (
      SELECT
      COUNT(*) AS total_rows
      FROM clean.fct_accounts_receivable
      where (
nombre_cliente in ($1)

and fecha_venta >= CURRENT_DATE-730
)
  ),
  params AS (
  SELECT 15 AS page_size, 1 as current_page
),
pagination AS (
  SELECT
    p.page_size,
    p.current_page,
    (p.current_page - 1) * p.page_size AS pagination_offset,
    CEIL(l.total_rows::DECIMAL / p.page_size) AS total_pages,
    l.total_rows
  FROM limits l, params p
),
  values AS (
    SELECT
            id_factura as id_venta,
      nombre_empresa as numero_sucursal,
       nombre_cliente,
       TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento,
       TO_CHAR(fecha_venta, 'YYYY-MM-DD') as fecha_venta,
       concat(dias_de_credito, ' días') AS indice_plazo_credito,
       CASE
           WHEN saldo_pendiente = 0 THEN '0 días'
           ELSE concat(GREATEST(CURRENT_DATE - (fecha_vencimiento), 0), ' días')
       END AS dias_vencidos,
       total_factura,
       total_abonado,
       saldo_pendiente
FROM clean.fct_accounts_receivable
where (
nombre_cliente in ($1)

and fecha_venta >= CURRENT_DATE-730
)
  ),
  numbered_rows AS (
    SELECT *,
      ROW_NUMBER() OVER (order by fecha_venta DESC,
              id_venta ASC) AS row_num
    FROM values
  )
  SELECT
    id_venta as "idVenta",
      numero_sucursal as "numeroSucursal",
      nombre_cliente as "nombreCliente",
      fecha_venta as "fechaVenta",
      fecha_vencimiento as "fechaVencimiento",
      indice_plazo_credito as "indicePlazoCredito",
      dias_vencidos as "diasVencidos",
      total_factura as "totalFactura",
      total_abonado as "totalAbonado",
      saldo_pendiente as "saldoPendiente"
  FROM numbered_rows, pagination
  WHERE row_num > pagination_offset
  AND row_num <= pagination_offset + page_size
  order by fecha_venta DESC,
              id_venta ASC;
`