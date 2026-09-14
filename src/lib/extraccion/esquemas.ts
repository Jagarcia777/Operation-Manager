import * as z from "zod/v4";

// Forma de lo que el modelo debe devolver al leer el Dashboard Ejecutivo.
// Todo campo es anulable a propósito: si un número no se lee con certeza, vale más un hueco
// declarado que un dato inventado.

export const FilaVentasExtraida = z.object({
  tienda: z.string().describe("Nombre de la tienda tal como aparece impreso"),
  ventasMeta: z.number().nullable(),
  ventasReal: z.number().nullable(),
  unidadesMeta: z.number().nullable(),
  unidadesReal: z.number().nullable(),
  transaccionesMeta: z.number().nullable(),
  transaccionesReal: z.number().nullable(),
  margenBrutoMeta: z.number().nullable().describe("%MB meta, como número: 30.5 para 30,5 %"),
  margenBrutoReal: z.number().nullable(),
});

export const SubtotalDeclarado = z.object({
  etiqueta: z.string().describe("Zona o total tal como aparece en el documento"),
  ventas: z.number().nullable(),
  unidades: z.number().nullable(),
  transacciones: z.number().nullable(),
});

export const ExtraccionVentas = z.object({
  periodo: z.string().nullable().describe("Período o corte indicado en el documento"),
  filas: z.array(FilaVentasExtraida),
  subtotalesDeclarados: z
    .array(SubtotalDeclarado)
    .describe("Subtotales y totales impresos en el documento, sin mezclarlos con las tiendas"),
  observaciones: z
    .array(z.string())
    .describe("Ambigüedades, celdas ilegibles o cualquier cosa que convenga confirmar"),
});

export const FilaAjusteExtraida = z.object({
  tienda: z.string().describe("Sucursal o zona tal como aparece impresa"),
  merma: z.number().nullable(),
  mercanciaDanada: z.number().nullable(),
  cargaYDescarga: z.number().nullable(),
  inventario: z.number().nullable(),
  ventas: z.number().nullable().describe("Tipología 'Ventas', la quinta columna del reporte"),
});

export const ExtraccionAjustes = z.object({
  periodo: z.string().nullable(),
  unidad: z
    .enum(["MONTO", "PORCENTAJE"])
    .describe("Si las cifras del documento son montos en $ o % sobre ventas"),
  filas: z.array(FilaAjusteExtraida),
  observaciones: z.array(z.string()),
});

export type ExtraccionVentasTipo = z.infer<typeof ExtraccionVentas>;
export type ExtraccionAjustesTipo = z.infer<typeof ExtraccionAjustes>;

// ─── Resumen Ejecutivo de Ventas de la cadena ───────────────────────────────
// El informe del sistema trae, en una sola página: una tabla por sucursal con el día anterior
// y el acumulado del mes, el panel de KPI de la cadena, la mezcla por categoría, los dos top 20
// de productos y dos comparativos de siete días. Se lee todo de una vez porque separarlo
// obligaría a subir el mismo archivo cinco veces.

export const FilaSucursalResumen = z.object({
  sucursal: z.string().describe("Nombre de la sucursal exactamente como aparece impreso"),

  diaVentas: z.number().nullable().describe("Columna VTAS del bloque del día anterior"),
  diaUnidades: z.number().nullable().describe("Columna UNID. del día"),
  diaMargenBruto: z.number().nullable().describe("MB% del día, como número: 24,94 % es 24.94"),
  diaTransacciones: z.number().nullable().describe("TRANS del día"),

  mesVentas: z.number().nullable().describe("VTAS del bloque ACUMULADOS DEL MES"),
  mesMeta: z.number().nullable().describe("Columna METAS del acumulado, tal como esté impresa"),
  mesUnidades: z.number().nullable().describe("UND del acumulado"),
  mesTransacciones: z.number().nullable().describe("TRANS del acumulado"),

  precioPromedio: z.number().nullable().describe("Columna PP del acumulado"),
  unidadesPorTicket: z.number().nullable().describe("Columna UNDTKT del acumulado"),
  ticketPromedio: z.number().nullable().describe("Columna TKTPROM del acumulado"),
});

export const CategoriaResumen = z.object({
  categoria: z.string().describe("Nombre de la categoría tal como aparece impreso"),
  ventas: z.number().nullable(),
  unidades: z.number().nullable(),
  margenBruto: z.number().nullable().describe("Margen %, como número"),
});

export const ProductoResumen = z.object({
  producto: z.string().describe("Descripción del producto tal como aparece impresa"),
  unidades: z.number().nullable(),
  familia: z.enum(["PERECEDERO", "NO_PERECEDERO"]).describe("De cuál de los dos top 20 sale"),
});

export const DiaResumen = z.object({
  fecha: z.string().describe("Fecha en formato AAAA-MM-DD"),
  ventas: z.number().nullable(),
});

export const PanelKpi = z.object({
  ventas: z.number().nullable(),
  meta: z.number().nullable(),
  unidades: z.number().nullable(),
  margenBruto: z.number().nullable(),
  transacciones: z.number().nullable(),
  precioPromedio: z.number().nullable(),
  unidadesPorTicket: z.number().nullable(),
  ticketPromedio: z.number().nullable(),
});

export const ExtraccionResumenEjecutivo = z.object({
  fecha: z
    .string()
    .nullable()
    .describe("Fecha del informe en formato AAAA-MM-DD, la que aparece arriba a la derecha"),
  sucursales: z.array(FilaSucursalResumen),
  totalImpreso: FilaSucursalResumen.nullable().describe(
    "La fila Total del cuadro de sucursales, aparte y nunca mezclada con las sucursales",
  ),
  kpiDia: PanelKpi.nullable().describe("Panel KPI's Dia"),
  kpiAcumulado: PanelKpi.nullable().describe("Panel KPI's Acum."),
  categorias: z.array(CategoriaResumen).describe("Cuadro Ventas por Categoria, sin la fila Total"),
  productos: z.array(ProductoResumen).describe("Los dos Top 20, sin las filas Total"),
  serieDiaria: z
    .array(DiaResumen)
    .describe(
      "Todos los días que se puedan reconstruir de los dos comparativos de 7 días, incluidos los de la semana anterior que aparecen en la columna de comparación",
    ),
  observaciones: z.array(z.string()),
});

export type ExtraccionResumenEjecutivoTipo = z.infer<typeof ExtraccionResumenEjecutivo>;
