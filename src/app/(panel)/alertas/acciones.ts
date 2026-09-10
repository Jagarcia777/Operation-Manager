"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ESTADOS_ALERTA, type EstadoAlerta } from "@/lib/dominio";
import { sincronizarAlertas } from "@/lib/validacion";

export async function revisarCorte(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  if (!corteId) return;
  await sincronizarAlertas(corteId);
  revalidatePath("/alertas");
  revalidatePath("/");
}

export async function cambiarEstadoAlerta(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !ESTADOS_ALERTA.includes(estado as EstadoAlerta)) return;

  await prisma.alerta.update({ where: { id }, data: { estado } });
  revalidatePath("/alertas");
  revalidatePath("/");
}
