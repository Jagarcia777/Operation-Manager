"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TAMANO_MAXIMO, TIPOS_ACEPTADOS, metaDeclarada } from "@/lib/carga";
import { leerCsvVentas } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { TIPOLOGIAS, type Tipologia } from "@/lib/dominio";
import {
  MODELO,
  explicarFalloIA,
  extraerAjustes,
  extraerResumenEjecutivo,
  extraerVentas,
} from "@/lib/extraccion/extraer";
import type { ExtraccionResumenEjecutivoTipo } from "@/lib/extraccion/esquemas";
import { guardarResumenEjecutivo } from "@/lib/extraccion/resumen";
import { leerUmbrales, revisarSubtotal, sincronizarAlertas } from "@/lib/validacion";


/** Marca de las cargas que vienen de una hoja de cálculo y no de la lectura con IA. */
const MODELO_CSV = "CSV";

/**
 * Importación CSV con plantilla fija. Pasa por la misma revisión que la lectura con IA: el
 * archivo se guarda como original de auditoría y lo leído queda como propuesta hasta que
 * alguien lo confirme.
 */
export async function importarCsv(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  const archivo = formData.get("archivo");

  if (!corteId || !(archivo instanceof File) || archivo.size === 0) {
    redirect("/cargar/csv?error=falta");
  }
  if (archivo.size > TAMANO_MAXIMO) {
    redirect("/cargar/csv?error=peso");
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const resultado = leerCsvVentas(buffer.toString("utf8"));
  if (!resultado.ok) {
    redirect(`/cargar/csv?corte=${corteId}&error=${encodeURIComponent(resultado.error)}`);
  }

  const extraccion = await prisma.extraccion.create({
    data: {
      corteId,
      destino: "VENTAS",
      archivoNombre: archivo.name,
      archivoTipo: "text/csv",
      archivoContenido: buffer,
      estado: "EXTRAIDO",
      modelo: MODELO_CSV,
      respuestaCruda: JSON.stringify(resultado.lectura),
    },
  });

  revalidatePath("/cargar");
  redirect(`/cargar/${extraccion.id}`);
}

export async function subirYExtraer(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  const destino = String(formData.get("destino") ?? "VENTAS");
  const archivo = formData.get("archivo");

  // El Resumen Ejecutivo trae su propia fecha y crea sus dos cortes —el día y el acumulado del
  // mes—, así que es el único documento que no se carga contra un corte ya existente.
  const creaSuCorte = destino === "RESUMEN";

  // Se responde con un mensaje en la pantalla, no con una excepción: un error de servidor
  // llega al navegador como "Application error" y un archivo equivocado no merece eso.
  if ((!corteId && !creaSuCorte) || !(archivo instanceof File) || archivo.size === 0) {
    redirect("/cargar?error=falta");
  }
  if (!TIPOS_ACEPTADOS[archivo.type]) {
    redirect("/cargar?error=tipo");
  }
  if (archivo.size > TAMANO_MAXIMO) {
    redirect("/cargar?error=peso");
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  const extraccion = await prisma.extraccion.create({
    data: {
      corteId: creaSuCorte ? null : corteId,
      destino,
      archivoNombre: archivo.name,
      archivoTipo: archivo.type,
      archivoContenido: buffer,
      estado: "PENDIENTE",
      modelo: MODELO,
    },
  });

  try {
    const entrada = { datos: buffer.toString("base64"), tipoMime: archivo.type };
    const lectura =
      destino === "AJUSTES"
        ? await extraerAjustes(entrada)
        : destino === "RESUMEN"
          ? await extraerResumenEjecutivo(entrada)
          : await extraerVentas(entrada);

    await prisma.extraccion.update({
      where: { id: extraccion.id },
      data: { estado: "EXTRAIDO", respuestaCruda: JSON.stringify(lectura) },
    });
  } catch (error) {
    await prisma.extraccion.update({
      where: { id: extraccion.id },
      data: {
        estado: "ERROR",
        error: explicarFalloIA(error),
      },
    });
  }

  revalidatePath("/cargar");
  redirect(`/cargar/${extraccion.id}`);
}

function aNumero(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

const CAMPO_POR_TIPOLOGIA: Record<Tipologia, string> = {
  MERMA: "merma",
  MERCANCIA_DANADA: "mercanciaDanada",
  CARGA_DESCARGA: "cargaYDescarga",
  INVENTARIO: "inventario",
  VENTAS: "ventas",
};

export async function confirmarExtraccion(formData: FormData) {
  const extraccionId = String(formData.get("extraccionId") ?? "");
  const extraccion = await prisma.extraccion.findUnique({ where: { id: extraccionId } });
  if (!extraccion) throw new Error("Extracción no encontrada.");

  if (extraccion.destino === "RESUMEN") {
    return confirmarResumen(extraccion.id, extraccion.respuestaCruda);
  }
  if (!extraccion.corteId) throw new Error("La extracción no tiene corte asociado.");

  const corteId = extraccion.corteId;
  const origen = extraccion.modelo === MODELO_CSV ? "CSV" : "IA";
  const filas = Number(formData.get("filas") ?? 0);

  for (let indice = 0; indice < filas; indice++) {
    const tiendaId = String(formData.get(`fila.${indice}.tiendaId`) ?? "");
    if (!tiendaId) continue;

    if (extraccion.destino === "AJUSTES") {
      const ventasReal = (
        await prisma.registroVentas.findUnique({
          where: { corteId_tiendaId: { corteId, tiendaId } },
        })
      )?.ventasReal;

      for (const tipologia of TIPOLOGIAS) {
        const leido = aNumero(formData.get(`fila.${indice}.${CAMPO_POR_TIPOLOGIA[tipologia]}`));
        if (leido === null) continue;

        // El documento puede venir en % o en monto; se guarda siempre el monto.
        const esPorcentaje = String(formData.get("unidad") ?? "MONTO") === "PORCENTAJE";
        const monto = esPorcentaje ? ((ventasReal ?? 0) * leido) / 100 : leido;
        const porcentaje = esPorcentaje
          ? leido
          : ventasReal
            ? (leido / ventasReal) * 100
            : null;

        await prisma.registroAjuste.upsert({
          where: { corteId_tiendaId_tipologia: { corteId, tiendaId, tipologia } },
          update: { monto, porcentaje, origen },
          create: { corteId, tiendaId, tipologia, monto, porcentaje, origen },
        });
      }
      continue;
    }

    const valores = {
      ventasMeta: metaDeclarada(aNumero(formData.get(`fila.${indice}.ventasMeta`))),
      ventasReal: aNumero(formData.get(`fila.${indice}.ventasReal`)),
      unidadesMeta: metaDeclarada(aNumero(formData.get(`fila.${indice}.unidadesMeta`))),
      unidadesReal: aNumero(formData.get(`fila.${indice}.unidadesReal`)),
      transaccionesMeta: metaDeclarada(aNumero(formData.get(`fila.${indice}.transaccionesMeta`))),
      transaccionesReal: aNumero(formData.get(`fila.${indice}.transaccionesReal`)),
      margenBrutoMeta: metaDeclarada(aNumero(formData.get(`fila.${indice}.margenBrutoMeta`))),
      margenBrutoReal: aNumero(formData.get(`fila.${indice}.margenBrutoReal`)),
    };

    await prisma.registroVentas.upsert({
      where: { corteId_tiendaId: { corteId, tiendaId } },
      update: { ...valores, origen },
      create: { corteId, tiendaId, ...valores, origen },
    });
  }

  await revisarSubtotalesDeclarados(extraccion, corteId);

  await prisma.extraccion.update({
    where: { id: extraccionId },
    data: { estado: "CONFIRMADO" },
  });

  await sincronizarAlertas(corteId);

  revalidatePath("/tablero");
  revalidatePath("/alertas");
  revalidatePath("/");
  redirect(extraccion.destino === "AJUSTES" ? "/ajustes" : "/tablero");
}

/**
 * Compara los subtotales impresos en el documento con la suma real de las tiendas cargadas.
 * Es la verificación que hoy se hace a mano y la que más errores de fuente destapa.
 */
async function revisarSubtotalesDeclarados(
  extraccion: { respuestaCruda: string | null; destino: string },
  corteId: string,
) {
  if (extraccion.destino !== "VENTAS" || !extraccion.respuestaCruda) return;

  let lectura: { subtotalesDeclarados?: { etiqueta: string; ventas: number | null }[] };
  try {
    lectura = JSON.parse(extraccion.respuestaCruda);
  } catch {
    return;
  }
  const declarados = lectura.subtotalesDeclarados ?? [];
  if (!declarados.length) return;

  const [umbrales, zonas, registros] = await Promise.all([
    leerUmbrales(),
    prisma.zona.findMany({ include: { tiendas: { select: { id: true } } } }),
    prisma.registroVentas.findMany({ where: { corteId } }),
  ]);
  const ventaPorTienda = new Map(registros.map((r) => [r.tiendaId, r.ventasReal ?? 0]));
  const totalCadena = registros.reduce((suma, r) => suma + (r.ventasReal ?? 0), 0);

  for (const declarado of declarados) {
    if (declarado.ventas === null) continue;

    const zona = zonas.find((z) =>
      declarado.etiqueta.toLowerCase().includes(z.gerente.toLowerCase().split(" ")[0]),
    );
    const suma = zona
      ? zona.tiendas.reduce((total, tienda) => total + (ventaPorTienda.get(tienda.id) ?? 0), 0)
      : totalCadena;

    const alerta = revisarSubtotal(
      declarado.etiqueta,
      declarado.ventas,
      suma,
      umbrales.TOLERANCIA_SUBTOTAL,
    );
    if (alerta) {
      await prisma.alerta.create({ data: { ...alerta, corteId } });
    }
  }
}

/** Captura manual: respaldo cuando no hay documento que leer o falla la lectura automática. */
export async function guardarCapturaManual(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  if (!corteId) return;

  const tiendaIds = formData.getAll("tiendaId").map(String);

  for (const tiendaId of tiendaIds) {
    const valores = {
      ventasMeta: metaDeclarada(aNumero(formData.get(`${tiendaId}.ventasMeta`))),
      ventasReal: aNumero(formData.get(`${tiendaId}.ventasReal`)),
      unidadesMeta: metaDeclarada(aNumero(formData.get(`${tiendaId}.unidadesMeta`))),
      unidadesReal: aNumero(formData.get(`${tiendaId}.unidadesReal`)),
      transaccionesMeta: metaDeclarada(aNumero(formData.get(`${tiendaId}.transaccionesMeta`))),
      transaccionesReal: aNumero(formData.get(`${tiendaId}.transaccionesReal`)),
      margenBrutoMeta: metaDeclarada(aNumero(formData.get(`${tiendaId}.margenBrutoMeta`))),
      margenBrutoReal: aNumero(formData.get(`${tiendaId}.margenBrutoReal`)),
    };

    const tieneAlgo = Object.values(valores).some((valor) => valor !== null);
    if (!tieneAlgo) continue;

    await prisma.registroVentas.upsert({
      where: { corteId_tiendaId: { corteId, tiendaId } },
      update: { ...valores, origen: "MANUAL" },
      create: { corteId, tiendaId, ...valores, origen: "MANUAL" },
    });
  }

  await sincronizarAlertas(corteId);
  revalidatePath("/tablero");
  revalidatePath("/");
  redirect(`/tablero?corte=${corteId}`);
}

export async function borrarExtraccion(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.extraccion.delete({ where: { id } });
  revalidatePath("/cargar");
}

/**
 * Guarda el Resumen Ejecutivo. A diferencia de los otros documentos no se revisa celda por
 * celda: son veinticinco sucursales por dos bloques, más categorías, productos y la serie
 * diaria. La comprobación que de verdad protege es otra —cada bloque se contrasta contra el
 * total que el propio informe imprime, y la pantalla de revisión muestra ese cuadre antes de
 * confirmar—, porque una fila saltada mueve el total y ninguna revisión a ojo de trescientas
 * celdas la habría encontrado.
 */
async function confirmarResumen(extraccionId: string, respuestaCruda: string | null) {
  if (!respuestaCruda) throw new Error("La lectura del documento está vacía.");
  const lectura = JSON.parse(respuestaCruda) as ExtraccionResumenEjecutivoTipo;

  const resultado = await guardarResumenEjecutivo(prisma, lectura);

  if (resultado.alertas.length) {
    await prisma.alerta.createMany({
      data: resultado.alertas.map((alerta) => ({ ...alerta, corteId: resultado.corteMesId })),
    });
  }

  await prisma.extraccion.update({
    where: { id: extraccionId },
    data: { estado: "CONFIRMADO", corteId: resultado.corteMesId },
  });

  await sincronizarAlertas(resultado.corteDiaId);
  await sincronizarAlertas(resultado.corteMesId);

  revalidatePath("/", "layout");
  redirect(`/tablero?corte=${resultado.corteMesId}`);
}
