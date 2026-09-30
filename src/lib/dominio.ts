// Valores cerrados del dominio. SQLite no soporta enums en Prisma, así que los campos son
// String y su conjunto válido se declara aquí, junto con la etiqueta que se muestra en la UI.

export const TIPOS_CORTE = ["DIARIO", "SEMANAL", "ACUMULADO_MES", "CIERRE_MES"] as const;
export type TipoCorte = (typeof TIPOS_CORTE)[number];
export const ETIQUETA_TIPO_CORTE: Record<TipoCorte, string> = {
  DIARIO: "Día",
  SEMANAL: "Semanal",
  ACUMULADO_MES: "Acumulado del mes",
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
  "HORAS_DESCUADRADAS",
  "ESTANDAR_DESCALIBRADO",
  "INDICADOR_NO_CUADRA",
  "VENTA_BAJO_COSTO",
] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];
export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  SUBTOTAL_DESCUADRADO: "Subtotal descuadrado",
  POSIBLE_INTERCAMBIO: "Posible Meta/Real intercambiado",
  VALOR_ATIPICO: "Valor atípico",
  DATO_FALTANTE: "Dato faltante",
  SALTO_IMPOSIBLE: "Salto imposible entre cortes",
  HORAS_DESCUADRADAS: "Horas que no cuadran",
  ESTANDAR_DESCALIBRADO: "Estándar fuera de escala",
  INDICADOR_NO_CUADRA: "Indicador impreso no cuadra",
  VENTA_BAJO_COSTO: "Vendido a costo o por debajo",
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

// PDF: leído directamente del texto del documento, sin IA.
export const ORIGENES_DATO = ["MANUAL", "CSV", "IA", "PDF"] as const;
export type OrigenDato = (typeof ORIGENES_DATO)[number];

export const ESTADOS_EXTRACCION = [
  "PENDIENTE",
  "EXTRAIDO",
  "CONFIRMADO",
  "ERROR",
] as const;
export type EstadoExtraccion = (typeof ESTADOS_EXTRACCION)[number];

export const DESTINOS_EXTRACCION = ["VENTAS", "AJUSTES", "RESUMEN", "CATEGORIAS"] as const;
export type DestinoExtraccion = (typeof DESTINOS_EXTRACCION)[number];
export const ETIQUETA_DESTINO: Record<DestinoExtraccion, string> = {
  VENTAS: "Tablero de ventas por tienda",
  AJUSTES: "Ajustes por tipología",
  RESUMEN: "Resumen Ejecutivo de la cadena",
  CATEGORIAS: "Ventas por categoría de una tienda",
};

// ─── Checklists de operación ────────────────────────────────────────────────

export const FRECUENCIAS_CHECKLIST = ["DIARIA", "SEMANAL", "MENSUAL", "EVENTUAL"] as const;
export type FrecuenciaChecklist = (typeof FRECUENCIAS_CHECKLIST)[number];
export const ETIQUETA_FRECUENCIA: Record<FrecuenciaChecklist, string> = {
  DIARIA: "Diaria",
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
  EVENTUAL: "Eventual",
};

/** Resultado de revisar un punto. PENDIENTE es "todavía no lo miré", no "está mal". */
export const CUMPLIMIENTOS = ["PENDIENTE", "OK", "NO_OK", "NO_APLICA"] as const;
export type Cumplimiento = (typeof CUMPLIMIENTOS)[number];
export const ETIQUETA_CUMPLIMIENTO: Record<Cumplimiento, string> = {
  PENDIENTE: "Sin revisar",
  OK: "OK",
  NO_OK: "No OK",
  NO_APLICA: "No aplica",
};

export const ESTADOS_CORRECCION = ["PENDIENTE", "EN_CURSO", "RESUELTO", "VERIFICADO"] as const;
export type EstadoCorreccion = (typeof ESTADOS_CORRECCION)[number];
export const ETIQUETA_ESTADO_CORRECCION: Record<EstadoCorreccion, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  RESUELTO: "Resuelto",
  VERIFICADO: "Verificado",
};

export const ESTADOS_INSPECCION = ["ABIERTA", "CERRADA"] as const;
export type EstadoInspeccion = (typeof ESTADOS_INSPECCION)[number];
export const ETIQUETA_ESTADO_INSPECCION: Record<EstadoInspeccion, string> = {
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
};

// ─── Eficiencia de la plantilla ─────────────────────────────────────────────
// Qué volumen mide la productividad de cada área. Las que no tienen volumen propio
// (limpieza, seguridad) se evalúan solo por cobertura: no hay venta ni unidades que dividir.

export const KPIS_PLANTILLA = ["SPLH", "UPLH", "TPLH", "COBERTURA"] as const;
export type KpiPlantilla = (typeof KPIS_PLANTILLA)[number];

export const ETIQUETA_KPI_PLANTILLA: Record<KpiPlantilla, string> = {
  SPLH: "Ventas por hora",
  UPLH: "Unidades por hora",
  TPLH: "Transacciones por hora",
  COBERTURA: "Cobertura de plantilla",
};

export const UNIDAD_KPI_PLANTILLA: Record<KpiPlantilla, string> = {
  SPLH: "$/hora",
  UPLH: "und/hora",
  TPLH: "trans/hora",
  COBERTURA: "% de la meta",
};

export const DESCRIPCION_KPI_PLANTILLA: Record<KpiPlantilla, string> = {
  SPLH: "Ventas del área ÷ horas trabajadas",
  UPLH: "Unidades repuestas o recibidas ÷ horas trabajadas",
  TPLH: "Transacciones atendidas ÷ horas trabajadas",
  COBERTURA: "Plantilla activa ÷ plantilla meta",
};

/**
 * Lectura del índice de eficiencia. DENTRO_DEL_RANGO existe porque el estándar internacional
 * es un rango: un área a 13 transacciones/hora con referencia 12–20 cumple, aunque quede por
 * debajo del punto medio. Tratar eso como desviación fabrica un problema que no existe.
 */
export const ESTADOS_EFICIENCIA = [
  "OPTIMO",
  "DENTRO_DEL_RANGO",
  "ACEPTABLE",
  "BAJO_ESTANDAR",
  "SIN_DATOS",
] as const;
export type EstadoEficiencia = (typeof ESTADOS_EFICIENCIA)[number];

export const ETIQUETA_EFICIENCIA: Record<EstadoEficiencia, string> = {
  OPTIMO: "Óptimo",
  DENTRO_DEL_RANGO: "En referencia",
  ACEPTABLE: "Aceptable",
  BAJO_ESTANDAR: "Bajo estándar",
  SIN_DATOS: "Sin datos",
};
