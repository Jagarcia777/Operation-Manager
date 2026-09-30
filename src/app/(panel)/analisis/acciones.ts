"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analizarCorte } from "@/lib/analisis/asesor";
import type { AnalisisCorteTipo } from "@/lib/analisis/esquema";
import { planDesdeRecomendacion, resolverAmbito } from "@/lib/analisis/plan";
import { MODELO } from "@/lib/extraccion/extraer";
import { prisma } from "@/lib/db";

export async function generarAnalisis(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  if (!corteId) return;

  const analisis = await analizarCorte(corteId);

  await prisma.analisis.create({
    data: {
      corteId,
      alcance: "CADENA",
      contenido: JSON.stringify(analisis),
      modelo: MODELO,
    },
  });

  revalidatePath("/analisis");
}

/**
 * Convierte una recomendación del análisis en un plan de acción en borrador. Si ya se creó
 * uno desde esa misma recomendación, lleva a él en vez de duplicarlo.
 */
export async function crearPlanDesdeRecomendacion(formData: FormData) {
  const analisisId = String(formData.get("analisisId") ?? "");
  const indice = Number(formData.get("indice"));
  const guardado = await prisma.analisis.findUnique({
    where: { id: analisisId },
    include: { corte: { select: { id: true, nombre: true } } },
  });
  if (!guardado || !Number.isInteger(indice)) return;

  const recomendacion = (JSON.parse(guardado.contenido) as AnalisisCorteTipo).recomendaciones[
    indice
  ];
  if (!recomendacion) return;

  const propuesta = planDesdeRecomendacion(recomendacion, guardado.corte.nombre);

  const existente = await prisma.planAccion.findFirst({
    where: { corteId: guardado.corteId, titulo: propuesta.titulo },
    select: { id: true },
  });
  if (existente) redirect(`/planes/${existente.id}`);

  const [zonas, tiendas] = await Promise.all([
    prisma.zona.findMany({ select: { id: true, nombre: true } }),
    prisma.tienda.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, codigo: true, alias: true },
    }),
  ]);

  const plan = await prisma.planAccion.create({
    data: {
      titulo: propuesta.titulo,
      ...resolverAmbito(recomendacion.ambito, zonas, tiendas),
      corteId: guardado.corteId,
      diagnostico: propuesta.diagnostico,
      oportunidadUsd: propuesta.oportunidadUsd,
      metas: { create: propuesta.meta },
      hitos: { create: propuesta.hito },
    },
  });

  revalidatePath("/planes");
  revalidatePath("/analisis");
  redirect(`/planes/${plan.id}`);
}
