"use server";

import { revalidatePath } from "next/cache";
import { analizarCorte } from "@/lib/analisis/asesor";
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
