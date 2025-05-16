interface VentasPorDia {
  year: string;
  month: string;
  week: string;
  day: string;
  ventas: string;
}

interface Periodo {
  year: number;
  week: number;
  ventas: string;
}

interface Summary {
  difference: string;
  firstPeriod: Periodo;
  secondPeriod: Periodo;
}

interface Moneda {
  id: string;
  nombre: string;
  simbolo: string;
}

interface VentasData {
  datePeriod: "week" | "month" | "day"; // puedes extender esto si hay más valores posibles
  timeComparison: "prior_period" | "year_over_year"; // ajustar según más opciones
  summary: Summary;
  data: VentasPorDia[];
  moneda: Moneda;
}

export interface InicioCardResponse {
  data: VentasData;
}
