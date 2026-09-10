"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ALCANCES_PLAN, ESTADOS_PLAN, type AlcancePlan, type EstadoPlan } from "@/lib/dominio";

function texto(formData: FormData, campo: string) {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || null;
}

function numero(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  if (valor === null) return null;
  const convertido = Number(valor.replace(",", "."));
  return Number.isFinite(convertido) ? convertido : null;
}

export async function crearPlan(formData: FormData) {
  const titulo = texto(formData, "titulo");
  const alcance = String(formData.get("alcance") ?? "CADENA");
  if (!titulo || !ALCANCES_PLAN.includes(alcance as AlcancePlan)) return;

  const plan = await prisma.planAccion.create({
    data: {
      titulo,
      alcance,
      zonaId: alcance === "ZONA" ? texto(formData, "zonaId") : null,
      tiendaId: alcance === "TIENDA" ? texto(formData, "tiendaId") : null,
      corteId: texto(formData, "corteId"),
      diagnostico: texto(formData, "diagnostico"),
      oportunidadUsd: numero(formData, "oportunidadUsd") ?? 0,
    },
  });

  revalidatePath("/planes");
  redirect(`/planes/${plan.id}`);
}

export async function cambiarEstadoPlan(formData: FormData) {
  const id = texto(formData, "id");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !ESTADOS_PLAN.includes(estado as EstadoPlan)) return;
  await prisma.planAccion.update({ where: { id }, data: { estado } });
  revalidatePath("/planes");
  revalidatePath(`/planes/${id}`);
}

export async function agregarMeta(formData: FormData) {
  const planId = texto(formData, "planId");
  const indicador = texto(formData, "indicador");
  if (!planId || !indicador) return;

  await prisma.metaPlan.create({
    data: {
      planId,
      indicador,
      valorActual: numero(formData, "valorActual"),
      valorObjetivo: numero(formData, "valorObjetivo"),
      unidad: String(formData.get("unidad") ?? "USD"),
    },
  });
  revalidatePath(`/planes/${planId}`);
}

export async function agregarHito(formData: FormData) {
  const planId = texto(formData, "planId");
  const descripcion = texto(formData, "descripcion");
  const mes = Number(formData.get("mes") ?? 1);
  if (!planId || !descripcion || mes < 1 || mes > 3) return;

  await prisma.hitoPlan.create({
    data: {
      planId,
      mes,
      descripcion,
      responsable: texto(formData, "responsable"),
    },
  });
  revalidatePath(`/planes/${planId}`);
}

export async function cambiarEstadoHito(formData: FormData) {
  const id = texto(formData, "id");
  const planId = texto(formData, "planId");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !planId) return;
  await prisma.hitoPlan.update({ where: { id }, data: { estado } });
  revalidatePath(`/planes/${planId}`);
}

export async function borrarPlan(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.planAccion.delete({ where: { id } });
  revalidatePath("/planes");
  redirect("/planes");
}
