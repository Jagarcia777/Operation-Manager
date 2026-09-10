const LOCALE = "es-VE";

const fmtMoneda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const fmtMonedaDecimal = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtNumero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function moneda(valor: number | null | undefined, conDecimales = false) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  // El signo va delante del símbolo: "-$51.100" y no "$-51.100".
  const formateador = conDecimales ? fmtMonedaDecimal : fmtMoneda;
  const texto = formateador.format(Math.abs(valor));
  return valor < 0 ? `-${texto}` : texto;
}

export function numero(valor: number | null | undefined, decimales = 0) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

export function porcentaje(valor: number | null | undefined, decimales = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${numero(valor, decimales)} %`;
}

export function variacion(valor: number | null | undefined, decimales = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${numero(valor, decimales)} %`;
}

export function compacto(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${numero(valor / 1_000_000, 1)} M`;
  if (abs >= 1_000) return `${numero(valor / 1_000, 0)} K`;
  return fmtNumero.format(valor);
}

export function fechaCorta(valor: Date | string | null | undefined) {
  if (!valor) return "—";
  const fecha = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

/** Color semántico del cumplimiento: verde cumple, ámbar cerca, rojo desviado. */
export function tonoCumplimiento(cumplimiento: number | null | undefined) {
  if (cumplimiento === null || cumplimiento === undefined) return "neutro" as const;
  if (cumplimiento >= 100) return "exito" as const;
  if (cumplimiento >= 95) return "atencion" as const;
  return "alerta" as const;
}

export const CLASES_TONO: Record<"exito" | "atencion" | "alerta" | "neutro", string> = {
  exito: "bg-exito-tenue text-exito",
  atencion: "bg-atencion-tenue text-atencion",
  alerta: "bg-alerta-tenue text-alerta",
  neutro: "bg-superficie-3 text-texto-2",
};
