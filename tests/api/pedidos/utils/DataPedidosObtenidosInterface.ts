export interface DataPedidosObtenidos {
    data: {
        fechaEncargo: string;
        sucursalId: number;
        pedidoId: number | null;
        pedidos: [
            {
                pedidoId: number | null;
                productoCodigo: string;
                fechaEntrega: string;
                fechaEncargo?: string;
                sucursalId?:number;
                existencia: number;
                cantidadOriginal: number;
                cantidadFinal?: number;
            }
        ]
    }
}