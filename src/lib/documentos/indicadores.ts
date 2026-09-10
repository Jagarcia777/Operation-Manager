import type { FilaCalculada } from "@/lib/calculos";
import { proyectarCierre } from "@/lib/calculos";

// Indicadores derivados que alimentan los informes: escenarios de cierre, ritmo requerido,
// semáforos y Balanced Scorecard. Todo determinista; el juicio lo pone el análisis, no esta capa.

export type Semaforo = "VERDE" | "AMBAR" | "ROJO";

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "En meta",
  AMBAR: "Atención",
  ROJO: "Desviado",
};

export const CLASE_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "bg-exito-tenue text-exito",
  AMBAR: "bg-atencion-tenue text-atencion",
  ROJO: "bg-alerta-tenue text-alerta",
};

/** Semáforo estándar: verde en meta, ámbar rozándola, rojo desviado. */
export function semaforo(
  valor: number | null,
  referencia: number | null,
  mejorEsMayor = true,
): Semaforo {
  if (valor === null || referencia === null || referencia === 0) return "AMBAR";
  const razon = mejorEsMayor ? valor / referencia : referencia / valor;
  if (razon >= 1) return "VERDE";
  if (razon >= 0.95) return "AMBAR";
  return "ROJO";
}

export type Viabilidad = "VIABLE" | "ALCANZABLE" | "EXIGENTE";

export type EscenariosCierre = {
  meta: number | null;
  acumulado: number | null;
  base: number | null;
  optimista: number | null;
  conservador: number | null;
  brechaBase: number | null;
  diasRestantes: number | null;
  ritmoActual: number | null;
  ritmoRequerido: number | null;
  exigencia: number | null;
  viabilidad: Viabilidad | null;
};

// Amplitud de los escenarios sobre el ritmo actual. Es un supuesto, y como tal se declara
// en el informe en vez de quedar escondido en el cálculo.
export const AMPLITUD_ESCENARIO = 0.08;

export function escenariosCierre(
  fila: Pick<FilaCalculada, "ventasReal" | "ventasMeta">,
  corte: { diasTranscurridos: number | null; diasDelMes: number | null },
): EscenariosCierre {
  const acumulado = fila.ventasReal;
  const meta = fila.ventasMeta;
  const base = proyectarCierre(acumulado, corte.diasTranscurridos, corte.diasDelMes);

  const diasRestantes =
    corte.diasDelMes && corte.diasTranscurridos
      ? corte.diasDelMes - corte.diasTranscurridos
      : null;

  const ritmoActual =
    acumulado !== null && corte.diasTranscurridos
      ? acumulado / corte.diasTranscurridos
      : null;

  const ritmoRequerido =
    meta !== null && acumulado !== null && diasRestantes && diasRestantes > 0
      ? (meta - acumulado) / diasRestantes
      : null;

  const exigencia =
    ritmoRequerido !== null && ritmoActual !== null && ritmoActual > 0
      ? ritmoRequerido / ritmoActual
      : null;

  let viabilidad: Viabilidad | null = null;
  if (exigencia !== null) {
    if (exigencia <= 1) viabilidad = "VIABLE";
    else if (exigencia <= 1.15) viabilidad = "ALCANZABLE";
    else viabilidad = "EXIGENTE";
  }

  return {
    meta,
    acumulado,
    base,
    optimista: base !== null ? base * (1 + AMPLITUD_ESCENARIO) : null,
    conservador: base !== null ? base * (1 - AMPLITUD_ESCENARIO) : null,
    brechaBase: base !== null && meta !== null ? base - meta : null,
    diasRestantes,
    ritmoActual,
    ritmoRequerido,
    exigencia,
    viabilidad,
  };
}

export const ETIQUETA_VIABILIDAD: Record<Viabilidad, string> = {
  VIABLE: "Viable",
  ALCANZABLE: "Alcanzable",
  EXIGENTE: "Exigente",
};

export const CLASE_VIABILIDAD: Record<Viabilidad, string> = {
  VIABLE: "bg-exito-tenue text-exito",
  ALCANZABLE: "bg-atencion-tenue text-atencion",
  EXIGENTE: "bg-alerta-tenue text-alerta",
};

export const PERSPECTIVAS_BSC = [
  "FINANCIERA",
  "CLIENTE",
  "PROCESOS",
  "APRENDIZAJE",
] as const;
export type PerspectivaBsc = (typeof PERSPECTIVAS_BSC)[number];
export const ETIQUETA_PERSPECTIVA: Record<PerspectivaBsc, string> = {
  FINANCIERA: "Financiera",
  CLIENTE: "Cliente",
  PROCESOS: "Procesos internos",
  APRENDIZAJE: "Aprendizaje y crecimiento",
};

export type FilaBsc = {
  perspectiva: PerspectivaBsc;
  indicador: string;
  valor: number | null;
  referencia: number | null;
  formato: "MONEDA" | "PORCENTAJE" | "NUMERO" | "DECIMAL";
  mejorEsMayor: boolean;
  nota?: string;
};

/**
 * Balanced Scorecard de la unidad contra su referencia. Solo incluye perspectivas que la data
 * sostiene: aprendizaje y crecimiento queda declarado como pendiente mientras no entren
 * indicadores de plantilla.
 */
export function balancedScorecard(
  unidad: FilaCalculada,
  referencia: FilaCalculada,
  extras?: { ajustesPct?: number | null; ajustesPctReferencia?: number | null },
): FilaBsc[] {
  return [
    {
      perspectiva: "FINANCIERA",
      indicador: "Ventas",
      valor: unidad.ventasReal,
      referencia: unidad.ventasMeta,
      formato: "MONEDA",
      mejorEsMayor: true,
    },
    {
      perspectiva: "FINANCIERA",
      indicador: "Logro contra meta",
      valor: unidad.cumplimientoVentas,
      referencia: 100,
      formato: "PORCENTAJE",
      mejorEsMayor: true,
    },
    {
      perspectiva: "FINANCIERA",
      indicador: "Margen bruto",
      valor: unidad.margenBrutoReal,
      referencia: referencia.margenBrutoReal,
      formato: "PORCENTAJE",
      mejorEsMayor: true,
    },
    {
      perspectiva: "CLIENTE",
      indicador: "Transacciones",
      valor: unidad.transaccionesReal,
      referencia: unidad.transaccionesMeta,
      formato: "NUMERO",
      mejorEsMayor: true,
    },
    {
      perspectiva: "CLIENTE",
      indicador: "RPT (ticket promedio)",
      valor: unidad.ticketPromedio,
      referencia: referencia.ticketPromedio,
      formato: "MONEDA",
      mejorEsMayor: true,
    },
    {
      perspectiva: "CLIENTE",
      indicador: "UPT (unidades por transacción)",
      valor: unidad.upt,
      referencia: referencia.upt,
      formato: "DECIMAL",
      mejorEsMayor: true,
    },
    {
      perspectiva: "PROCESOS",
      indicador: "ASP (precio medio por unidad)",
      valor: asp(unidad),
      referencia: asp(referencia),
      formato: "MONEDA",
      mejorEsMayor: true,
    },
    {
      perspectiva: "PROCESOS",
      indicador: "Ajustes sobre ventas",
      valor: extras?.ajustesPct ?? null,
      referencia: extras?.ajustesPctReferencia ?? null,
      formato: "PORCENTAJE",
      mejorEsMayor: false,
      nota: "Menor es mejor: mide la pérdida operativa.",
    },
    {
      perspectiva: "APRENDIZAJE",
      indicador: "Productividad de plantilla",
      valor: null,
      referencia: null,
      formato: "MONEDA",
      mejorEsMayor: true,
      nota: "Sin datos de plantilla cargados. Requiere horas-hombre por tienda.",
    },
  ];
}

/**
 * Venta por día del período. Es la única forma de comparar dos cortes acumulados: contrastar
 * el acumulado al día 23 contra el acumulado al día 12 mide días, no desempeño.
 */
export function ritmoDiario(
  ventas: number | null,
  diasTranscurridos: number | null | undefined,
): number | null {
  if (ventas === null || !diasTranscurridos) return null;
  return ventas / diasTranscurridos;
}

/** Precio medio por unidad vendida. */
export function asp(fila: FilaCalculada): number | null {
  if (!fila.ventasReal || !fila.unidadesReal) return null;
  return fila.ventasReal / fila.unidadesReal;
}

export type Diagnostico = {
  fortalezas: string[];
  alertas: string[];
};

/**
 * Lectura mecánica del desempeño de una tienda. Son los hechos que se desprenden de las cifras;
 * la interpretación y el plan los aporta el análisis.
 */
export function diagnosticar(
  nombre: string,
  fila: FilaCalculada,
  zona: FilaCalculada,
  margenMinimo: number,
): Diagnostico {
  const fortalezas: string[] = [];
  const alertas: string[] = [];

  if ((fila.cumplimientoVentas ?? 0) >= 100) {
    fortalezas.push(`Cierra el período en meta, con ${fmt(fila.cumplimientoVentas)} % de logro.`);
  } else if (fila.cumplimientoVentas !== null) {
    alertas.push(
      `Queda en ${fmt(fila.cumplimientoVentas)} % de logro, con una brecha de ${fmt(fila.brechaVentas, 0)} contra su meta.`,
    );
  }

  if (fila.margenBrutoReal !== null && fila.margenBrutoReal < margenMinimo) {
    alertas.push(
      `Margen bruto de ${fmt(fila.margenBrutoReal)} %, por debajo del mínimo de ${fmt(margenMinimo)} % fijado por el negocio.`,
    );
  } else if (
    fila.margenBrutoReal !== null &&
    zona.margenBrutoReal !== null &&
    fila.margenBrutoReal > zona.margenBrutoReal
  ) {
    fortalezas.push(
      `Margen de ${fmt(fila.margenBrutoReal)} %, por encima del ${fmt(zona.margenBrutoReal)} % de la zona.`,
    );
  }

  if (fila.ticketPromedio !== null && zona.ticketPromedio !== null) {
    if (fila.ticketPromedio >= zona.ticketPromedio) {
      fortalezas.push(`Ticket promedio sobre el de la zona (${fmt(fila.ticketPromedio)}).`);
    } else {
      alertas.push(
        `Ticket promedio de ${fmt(fila.ticketPromedio)}, bajo el ${fmt(zona.ticketPromedio)} de la zona.`,
      );
    }
  }

  if (fila.upt !== null && zona.upt !== null && fila.upt < zona.upt) {
    alertas.push(
      `Lleva ${fmt(fila.upt)} unidades por transacción frente a ${fmt(zona.upt)} en la zona: menos piezas por compra.`,
    );
  }

  if (!fortalezas.length) fortalezas.push(`Sin indicadores por encima de la zona en este corte.`);
  if (!alertas.length) alertas.push(`${nombre} no presenta desviaciones en los indicadores base.`);

  return { fortalezas, alertas };
}

function fmt(valor: number | null, decimales = 2) {
  if (valor === null) return "—";
  return valor.toLocaleString("es-VE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
