import { APIRequestContext } from '@playwright/test';

export class DashboardClientesAPI {
  private request: APIRequestContext;
  private baseUrl: string;

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseUrl = process.env.API_URL!;
  }

  /**
   * Llama al endpoint de información general del cliente (Query 48)
   */
  async obtenerInformacionGeneral(nombreCliente: string) {
    const body = {
      nombreCliente: [nombreCliente]
    };

    const response = await this.request.post(`${this.baseUrl}/api/queries/exec/48`, {
      data: body
    });

    if (!response.ok()) {
      throw new Error(`La API devolvió un error: ${response.status()}`);
    }

    const json = await response.json();
    return json.data.cliente;
  }
}
