export const getNuevoPedidoQuery = `
    select pe."pedidoId", 
          pr."productoCodigo",
          "productoNombre",
          "categoriaId",
          to_char("fechaEncargo"::date, 'YYYY-MM-DD') as "fechaEncargo",
          to_char("fechaEntrega"::date, 'YYYY-MM-DD') as "fechaEntrega",
          "existencia",
          "cantidadOriginal",
          "cantidadFinal" 
        from public."producto" pr
        join public."producto_pedido" pp on pp."productoCodigo"=pr."productoCodigo"
        join public."pedido" pe on pe."pedidoId" = pp."pedidoId"
        where pp."fechaEntrega">$1 
        and pr."categoriaId" in (
            select "categoriaId" 
            from public."categoria_dia" 
            where "diaId"=(select date_part('dow',$1::date))
          )
        and "sucursalId"=$2 
        and "fechaEncargo"<=$1
        union
          select null as "pedidoId", 
            pr."productoCodigo",
            "productoNombre",
            "categoriaId",
            to_char($1::date, 'YYYY-MM-DD') as "fechaEncargo",
            public.calc_fecha_entrega("categoriaId",$1::date)::varchar as "fechaEntrega",
            0 as "existencia",
            0 as "cantidadOriginal",
            null as "cantidadFinal" 
          from public."producto" pr
          where pr."categoriaId" in (
        select "categoriaId" 
        from public."categoria_dia"
        where "diaId"=(select date_part('dow',$1::date)))
          and pr."activo"=true
        order by "categoriaId","productoNombre","fechaEncargo";
`;

export const getPedidoExistenteQuery = `
        select 
          pe."pedidoId", 
          pr."productoCodigo",
          "productoNombre",
          "categoriaId",
          to_char("fechaEncargo"::date, 'YYYY-MM-DD') as "fechaEncargo",
          to_char("fechaEntrega"::date, 'YYYY-MM-DD') as "fechaEntrega",
          "existencia",
          "cantidadOriginal",
          "cantidadFinal" 
        from public."producto" pr
        join public."producto_pedido" pp 
          on pp."productoCodigo"=pr."productoCodigo"
        join public."pedido" pe 
          on pe."pedidoId" = pp."pedidoId"
        where pp."fechaEntrega">$1 
          and pr."categoriaId" in (
            select "categoriaId" 
            from public."categoria_dia" 
            where "diaId"=(
              select date_part('dow',$1::date)
            )
          )
          and "sucursalId"=$2 
          and "fechaEncargo"<=$1
        order by "categoriaId",
          "productoNombre",
          "fechaEncargo";
`;