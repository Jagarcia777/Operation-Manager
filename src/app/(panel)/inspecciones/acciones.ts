"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CUMPLIMIENTOS, ESTADOS_CORRECCION, type Cumplimiento, type EstadoCorreccion } from "@/lib/dominio";

function texto(formData: FormData, campo: string) {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || null;
}

function fecha(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  return valor ? new Date(valor) : null;
}

/** Abre una inspección y deja un renglón por cada punto de la plantilla, sin revisar. */
export async function iniciarInspeccion(formData: FormData) {
  const checklistId = String(formData.get("checklistId") ?? "");
  const tiendaId = String(formData.get("tiendaId") ?? "");
  if (!checklistId || !tiendaId) redirect("/inspecciones?error=faltan");

  const puntos = await prisma.puntoChecklist.findMany({
    where: { checklistId },
    orderBy: { orden: "asc" },
  });
  if (!puntos.length) redirect("/inspecciones?error=sinpuntos");

  const corte = await prisma.corte.findFirst({ orderBy: { fechaFin: "desc" } });

  const inspeccion = await prisma.inspeccion.create({
    data: {
      checklistId,
      tiendaId,
      corteId: corte?.id ?? null,
      responsable: texto(formData, "responsable"),
      resultados: { create: puntos.map((punto) => ({ puntoId: punto.id })) },
    },
  });

  revalidatePath("/inspecciones");
  redirect(`/inspecciones/${inspeccion.id}`);
}

/**
 * Guarda la hoja completa de una vez. Quien recorre una tienda marca todo y guarda al final;
 * un botón por renglón obligaría a veinte viajes al servidor para una sola ronda.
 */
export async function guardarInspeccion(formData: FormData) {
  const inspeccionId = String(formData.get("inspeccionId") ?? "");
  if (!inspeccionId) return;

  const resultados = await prisma.resultadoPunto.findMany({ where: { inspeccionId } });

  for (const resultado of resultados) {
    const prefijo = `punto.${resultado.id}`;
    const cumpleLeido = String(formData.get(`${prefijo}.cumple`) ?? "PENDIENTE");
    const cumple = (CUMPLIMIENTOS as readonly string[]).includes(cumpleLeido)
      ? (cumpleLeido as Cumplimiento)
      : "PENDIENTE";

    const estadoLeido = String(formData.get(`${prefijo}.estado`) ?? "PENDIENTE");
    const estado = (ESTADOS_CORRECCION as readonly string[]).includes(estadoLeido)
      ? (estadoLeido as EstadoCorreccion)
      : "PENDIENTE";

    // Lo que no está mal no arrastra observación ni corrección: dejarlas escritas después de
    // marcar OK haría que la hoja contara hallazgos que ya no existen.
    const esHallazgo = cumple === "NO_OK";

    await prisma.resultadoPunto.update({
      where: { id: resultado.id },
      data: {
        cumple,
        observacion: esHallazgo ? texto(formData, `${prefijo}.observacion`) : null,
        correccion: esHallazgo ? texto(formData, `${prefijo}.correccion`) : null,
        responsable: esHallazgo ? texto(formData, `${prefijo}.responsable`) : null,
        fechaLimite: esHallazgo ? fecha(formData, `${prefijo}.fechaLimite`) : null,
        estado: esHallazgo ? estado : "PENDIENTE",
      },
    });
  }

  await prisma.inspeccion.update({
    where: { id: inspeccionId },
    data: { nota: texto(formData, "nota") },
  });

  revalidatePath(`/inspecciones/${inspeccionId}`);
  revalidatePath("/inspecciones");
  redirect(`/inspecciones/${inspeccionId}?hecho=guardado`);
}

/**
 * Cerrar una inspección la da por revisada. No se puede cerrar con un punto crítico marcado
 * NO OK sin corrección escrita: eso es justo lo que no puede quedarse sin dueño.
 */
export async function cerrarInspeccion(formData: FormData) {
  const inspeccionId = String(formData.get("inspeccionId") ?? "");
  if (!inspeccionId) return;

  const pendientes = await prisma.resultadoPunto.count({
    where: {
      inspeccionId,
      cumple: "NO_OK",
      punto: { critico: true },
      OR: [{ correccion: null }, { correccion: "" }],
    },
  });
  if (pendientes > 0) redirect(`/inspecciones/${inspeccionId}?error=criticos`);

  const sinRevisar = await prisma.resultadoPunto.count({
    where: { inspeccionId, cumple: "PENDIENTE" },
  });
  if (sinRevisar > 0) redirect(`/inspecciones/${inspeccionId}?error=sinrevisar`);

  await prisma.inspeccion.update({ where: { id: inspeccionId }, data: { estado: "CERRADA" } });
  revalidatePath(`/inspecciones/${inspeccionId}`);
  revalidatePath("/inspecciones");
  redirect(`/inspecciones/${inspeccionId}?hecho=cerrada`);
}

export async function reabrirInspeccion(formData: FormData) {
  const inspeccionId = String(formData.get("inspeccionId") ?? "");
  if (!inspeccionId) return;
  await prisma.inspeccion.update({ where: { id: inspeccionId }, data: { estado: "ABIERTA" } });
  revalidatePath(`/inspecciones/${inspeccionId}`);
  revalidatePath("/inspecciones");
}

export async function eliminarInspeccion(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.inspeccion.delete({ where: { id } });
  revalidatePath("/inspecciones");
  redirect("/inspecciones");
}
