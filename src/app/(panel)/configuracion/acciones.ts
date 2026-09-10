"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ESTADOS_CORTE, TIPOS_CORTE, type EstadoCorte, type TipoCorte } from "@/lib/dominio";

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

function refrescar() {
  revalidatePath("/configuracion");
  revalidatePath("/tablero");
  revalidatePath("/");
}

export async function guardarPerfil(formData: FormData) {
  await prisma.perfil.upsert({
    where: { id: "maestro" },
    update: {
      nombre: texto(formData, "nombre") ?? "Usuario maestro",
      cargo: texto(formData, "cargo") ?? "Operaciones",
      zonaPropiaId: texto(formData, "zonaPropiaId"),
      contexto: texto(formData, "contexto"),
      instruccionesCerebro: texto(formData, "instruccionesCerebro"),
    },
    create: {
      id: "maestro",
      nombre: texto(formData, "nombre") ?? "Usuario maestro",
      cargo: texto(formData, "cargo") ?? "Operaciones",
      zonaPropiaId: texto(formData, "zonaPropiaId"),
      contexto: texto(formData, "contexto"),
      instruccionesCerebro: texto(formData, "instruccionesCerebro"),
    },
  });
  refrescar();
}

export async function guardarZona(formData: FormData) {
  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  const gerente = texto(formData, "gerente");
  if (!nombre || !gerente) return;

  if (id) {
    await prisma.zona.update({ where: { id }, data: { nombre, gerente } });
  } else {
    const total = await prisma.zona.count();
    await prisma.zona.create({ data: { nombre, gerente, orden: total + 1 } });
  }
  refrescar();
}

export async function guardarTienda(formData: FormData) {
  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  const zonaId = texto(formData, "zonaId");
  if (!nombre || !zonaId) return;

  const fechaTexto = texto(formData, "fechaApertura");
  const datos = {
    nombre,
    zonaId,
    codigo: texto(formData, "codigo"),
    alias: texto(formData, "alias"),
    ciudad: texto(formData, "ciudad"),
    formato: texto(formData, "formato"),
    metrosCuadrados: numero(formData, "metrosCuadrados"),
    fechaApertura: fechaTexto ? new Date(fechaTexto) : null,
    activa: formData.get("activa") !== null,
  };

  if (id) {
    await prisma.tienda.update({ where: { id }, data: datos });
  } else {
    const total = await prisma.tienda.count();
    await prisma.tienda.create({ data: { ...datos, orden: total + 1 } });
  }
  refrescar();
}

export async function crearCorte(formData: FormData) {
  const nombre = texto(formData, "nombre");
  const tipo = String(formData.get("tipo") ?? "");
  const inicio = texto(formData, "fechaInicio");
  const fin = texto(formData, "fechaFin");
  if (!nombre || !inicio || !fin || !TIPOS_CORTE.includes(tipo as TipoCorte)) return;

  await prisma.corte.create({
    data: {
      nombre,
      tipo,
      fechaInicio: new Date(inicio),
      fechaFin: new Date(fin),
      diasDelMes: numero(formData, "diasDelMes"),
      diasTranscurridos: numero(formData, "diasTranscurridos"),
    },
  });
  refrescar();
}

export async function cambiarEstadoCorte(formData: FormData) {
  const id = texto(formData, "id");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !ESTADOS_CORTE.includes(estado as EstadoCorte)) return;
  await prisma.corte.update({ where: { id }, data: { estado } });
  refrescar();
}

/** Borra el corte con todo lo que cuelga de él: registros, ajustes, alertas y análisis. */
export async function eliminarCorte(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.corte.delete({ where: { id } });
  refrescar();
  revalidatePath("/alertas");
  revalidatePath("/ajustes");
}

export async function guardarUmbral(formData: FormData) {
  const id = texto(formData, "id");
  const valor = numero(formData, "valor");
  if (!id || valor === null) return;
  await prisma.umbral.update({ where: { id }, data: { valor } });
  refrescar();
}

export async function guardarBenchmark(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.benchmark.update({
    where: { id },
    data: {
      valor: numero(formData, "valor"),
      fuente: texto(formData, "fuente") ?? "Interno",
    },
  });
  refrescar();
  revalidatePath("/documentos/ejecutivo");
}

export async function agregarNota(formData: FormData) {
  const contenido = texto(formData, "texto");
  if (!contenido) return;
  await prisma.notaMemoria.create({
    data: {
      texto: contenido,
      etiqueta: texto(formData, "etiqueta"),
      tiendaId: texto(formData, "tiendaId"),
    },
  });
  refrescar();
}

export async function archivarNota(formData: FormData) {
  const id = texto(formData, "id");
  if (!id) return;
  await prisma.notaMemoria.update({ where: { id }, data: { vigente: false } });
  refrescar();
}
