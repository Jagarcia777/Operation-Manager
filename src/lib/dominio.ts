// Valores cerrados del dominio. SQLite no soporta enums en Prisma, así que los campos son
// String y su conjunto válido se declara aquí, junto con la etiqueta que se muestra en la UI.

export const TIPOS_CORTE = ["SEMANAL", "CIERRE_MES"] as const;
export type TipoCorte = (typeof TIPOS_CORTE)[number];
export const ETIQUETA_TIPO_CORTE: Record<TipoCorte, string> = {
  SEMANAL: "Semanal",
  CIERRE_MES: "Cierre de mes",
};

export const ESTADOS_CORTE = ["BORRADOR", "REVISION", "CERRADO"] as const;
export type EstadoCorte = (typeof ESTADOS_CORTE)[number];
export const ETIQUETA_ESTADO_CORTE: Record<EstadoCorte, string> = {
  BORRADOR: "Borrador",
  REVISION: "En revisión",
  CERRADO: "Cerrado",
};

// Orden y nombres tal como vienen en el reporte de ajustes de la cadena.
export const TIPOLOGIAS = [
  "MERMA",
  "MERCANCIA_DANADA",
  "CARGA_DESCARGA",
  "INVENTARIO",
  "VENTAS",
] as const;
export type Tipologia = (typeof TIPOLOGIAS)[number];
export const ETIQUETA_TIPOLOGIA: Record<Tipologia, string> = {
  MERMA: "Merma",
  MERCANCIA_DANADA: "Mercancía Dañada",
  CARGA_DESCARGA: "Carga y Descarga",
  INVENTARIO: "Inventario",
  VENTAS: "Ventas",
};

export const INDICADORES = [
  "ventas",
  "unidades",
  "transacciones",
  "margenBruto",
] as const;
export type Indicador = (typeof INDICADORES)[number];
export const ETIQUETA_INDICADOR: Record<Indicador, string> = {
  ventas: "Ventas $",
  unidades: "Unidades",
  transacciones: "Transacciones",
  margenBruto: "%MB",
};

// Clasificación de categorías: Pareto separa lo vital de lo accesorio por peso en la venta,
// y BCG cruza ese peso con el margen que aporta.
export const ZONAS_PARETO = ["VITAL", "COMPLEMENTO"] as const;
export type ZonaPareto = (typeof ZONAS_PARETO)[number];
export const ETIQUETA_PARETO: Record<ZonaPareto, string> = {
  VITAL: "Vital (80%)",
  COMPLEMENTO: "Complemento",
};

export const CLASES_BCG = ["ESTRELLA", "VACA_LECHERA", "INTERROGANTE", "PERRO"] as const;
export type ClaseBcg = (typeof CLASES_BCG)[number];
export const ETIQUETA_BCG: Record<ClaseBcg, string> = {
  ESTRELLA: "Estrella",
  VACA_LECHERA: "Vaca lechera",
  INTERROGANTE: "Interrogante",
  PERRO: "Perro",
};

export const TIPOS_ALERTA = [
  "SUBTOTAL_DESCUADRADO",
  "POSIBLE_INTERCAMBIO",
  "VALOR_ATIPICO",
  "DATO_FALTANTE",
  "SALTO_IMPOSIBLE",
] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];
export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  SUBTOTAL_DESCUADRADO: "Subtotal descuadrado",
  POSIBLE_INTERCAMBIO: "Posible Meta/Real intercambiado",
  VALOR_ATIPICO: "Valor atípico",
  DATO_FALTANTE: "Dato faltante",
  SALTO_IMPOSIBLE: "Salto imposible entre cortes",
};

export const SEVERIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const ESTADOS_ALERTA = ["ABIERTA", "REVISADA", "DESCARTADA"] as const;
export type EstadoAlerta = (typeof ESTADOS_ALERTA)[number];
export const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  ABIERTA: "Abierta",
  REVISADA: "Revisada",
  DESCARTADA: "Descartada",
};

export const ALCANCES_PLAN = ["CADENA", "ZONA", "TIENDA"] as const;
export type AlcancePlan = (typeof ALCANCES_PLAN)[number];
export const ETIQUETA_ALCANCE_PLAN: Record<AlcancePlan, string> = {
  CADENA: "Toda la cadena",
  ZONA: "Zona",
  TIENDA: "Tienda",
};

export const ESTADOS_PLAN = ["BORRADOR", "ACTIVO", "CERRADO"] as const;
export type EstadoPlan = (typeof ESTADOS_PLAN)[number];

export const UNIDADES_META = ["USD", "UNIDADES", "PORCENTAJE"] as const;
export type UnidadMeta = (typeof UNIDADES_META)[number];

export const ESTADOS_HITO = ["PENDIENTE", "EN_CURSO", "COMPLETADO"] as const;
export type EstadoHito = (typeof ESTADOS_HITO)[number];

export const ORIGENES_DATO = ["MANUAL", "CSV", "IA"] as const;
export type OrigenDato = (typeof ORIGENES_DATO)[number];

export const ESTADOS_EXTRACCION = [
  "PENDIENTE",
  "EXTRAIDO",
  "CONFIRMADO",
  "ERROR",
] as const;
export type EstadoExtraccion = (typeof ESTADOS_EXTRACCION)[number];

export const DESTINOS_EXTRACCION = ["VENTAS", "AJUSTES"] as const;
export type DestinoExtraccion = (typeof DESTINOS_EXTRACCION)[number];
