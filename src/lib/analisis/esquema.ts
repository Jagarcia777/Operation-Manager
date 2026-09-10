import * as z from "zod/v4";

// Forma del análisis. El modelo interpreta y aconseja; las cifras que cita vienen de la
// evidencia calculada, no de su propia aritmética.

export const Hallazgo = z.object({
  titulo: z.string().describe("El hallazgo en una línea, directo"),
  ambito: z.string().describe("Cadena, la zona o la tienda a la que aplica"),
  evidencia: z.string().describe("El dato concreto que lo sustenta, citando la cifra"),
  causaProbable: z.string().describe("Causa raíz probable, distinguiéndola del síntoma"),
  severidad: z.enum(["ALTA", "MEDIA", "BAJA"]),
});

export const Recomendacion = z.object({
  accion: z.string().describe("Acción ejecutable en tienda, concreta y verificable"),
  ambito: z.string(),
  impactoUsd: z
    .number()
    .nullable()
    .describe("Oportunidad estimada en dólares, o null si no se puede estimar con esta data"),
  esfuerzo: z.enum(["BAJO", "MEDIO", "ALTO"]),
  plazo: z.enum(["INMEDIATO", "30_DIAS", "90_DIAS"]),
  comoMedirlo: z.string().describe("Indicador y valor objetivo con que se sabrá si funcionó"),
});

export const AnalisisCorte = z.object({
  lecturaGeneral: z
    .string()
    .describe(
      "Diagnóstico crítico del corte en dos o tres párrafos: qué pasó realmente, no lo que dice el número grande",
    ),
  hallazgos: z.array(Hallazgo).describe("Ordenados por importancia, no por orden de aparición"),
  recomendaciones: z
    .array(Recomendacion)
    .describe("Ordenadas por impacto en dólares frente al esfuerzo que exigen"),
  escenarioCierre: z.object({
    piso: z.number().nullable(),
    esperado: z.number().nullable(),
    techo: z.number().nullable(),
    supuestos: z.array(z.string()),
  }),
  loQueNoSePuedeConcluir: z
    .array(z.string())
    .describe("Preguntas que esta data no responde y que conviene no responder a ojo"),
});

export type AnalisisCorteTipo = z.infer<typeof AnalisisCorte>;
