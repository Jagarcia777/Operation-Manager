"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sincronizarAlertas } from "@/lib/validacion";

/** Lee un número del formulario. Un campo vacío queda en null: faltante no es cero. */
function numero(formData: FormData, campo: string): number | null {
  const crudo = String(formData.get(campo) ?? "").trim().replace(",", ".");
  if (!crudo) return null;
  const valor = Number(crudo);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Guarda la captura de plantilla de una tienda en un corte. Un área sin ningún dato se borra
 * en vez de quedar como una fila de nulos: así "sin capturar" y "capturado en cero" no se
 * confunden en el índice.
 */
export async function guardarPlantilla(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  const tiendaId = String(formData.get("tiendaId") ?? "");
  if (!corteId || !tiendaId) redirect("/plantilla?error=faltan");

  const areas = await prisma.areaOperativa.findMany({
    where: { activa: true },
    orderBy: { orden: "asc" },
  });

  for (const area of areas) {
    const valores = {
      plantillaMeta: numero(formData, `${area.id}.plantillaMeta`),
      plantillaActiva: numero(formData, `${area.id}.plantillaActiva`),
      horasProgramadas: numero(formData, `${area.id}.horasProgramadas`),
      horasTrabajadas: numero(formData, `${area.id}.horasTrabajadas`),
      horasAusentismo: numero(formData, `${area.id}.horasAusentismo`),
      horasExtra: numero(formData, `${area.id}.horasExtra`),
      // Solo se pide el volumen que le toca al KPI del área; el resto queda nulo a propósito.
      ventas: area.kpi === "SPLH" && !area.usaVentaTienda ? numero(formData, `${area.id}.volumen`) : null,
      unidades: area.kpi === "UPLH" ? numero(formData, `${area.id}.volumen`) : null,
      transacciones: area.kpi === "TPLH" ? numero(formData, `${area.id}.volumen`) : null,
      costoNomina: numero(formData, `${area.id}.costoNomina`),
    };

    const vacia = Object.values(valores).every((valor) => valor === null);

    if (vacia) {
      await prisma.registroPlantilla.deleteMany({
        where: { corteId, tiendaId, areaId: area.id },
      });
      continue;
    }

    await prisma.registroPlantilla.upsert({
      where: { corteId_tiendaId_areaId: { corteId, tiendaId, areaId: area.id } },
      update: { ...valores, origen: "MANUAL" },
      create: { corteId, tiendaId, areaId: area.id, ...valores, origen: "MANUAL" },
    });
  }

  // La captura puede levantar horas que no cuadran: se revisa al guardar, no al mirar.
  await sincronizarAlertas(corteId);

  revalidatePath("/plantilla");
  revalidatePath("/alertas");
  redirect(`/plantilla?corte=${corteId}&tienda=${tiendaId}&guardado=1`);
}
