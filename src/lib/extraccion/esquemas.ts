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
