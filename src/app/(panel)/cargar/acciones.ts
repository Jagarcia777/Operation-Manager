"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TAMANO_MAXIMO, TIPOS_ACEPTADOS } from "@/lib/carga";
import { prisma } from "@/lib/db";
import { TIPOLOGIAS, type Tipologia } from "@/lib/dominio";
import { MODELO, explicarFalloIA, extraerAjustes, extraerVentas } from "@/lib/extraccion/extraer";
import { leerUmbrales, revisarSubtotal, sincronizarAlertas } from "@/lib/validacion";



export async function subirYExtraer(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  const destino = String(formData.get("destino") ?? "VENTAS");
  const archivo = formData.get("archivo");

  if (!corteId || !(archivo instanceof File) || archivo.size === 0) {
    throw new Error("Falta el corte o el archivo.");
  }
  if (!TIPOS_ACEPTADOS[archivo.type]) {
    throw new Error("Solo se aceptan PDF, PNG, JPG o WEBP.");
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error("El archivo supera los 4 MB.");
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  const extraccion = await prisma.extraccion.create({
    data: {
      corteId,
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
      destino === "AJUSTES" ? await extraerAjustes(entrada) : await extraerVentas(entrada);

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
  if (!extraccion?.corteId) throw new Error("Extracción no encontrada.");

  const corteId = extraccion.corteId;
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
          update: { monto, porcentaje, origen: "IA" },
          create: { corteId, tiendaId, tipologia, monto, porcentaje, origen: "IA" },
        });
      }
      continue;
    }

    const valores = {
      ventasMeta: aNumero(formData.get(`fila.${indice}.ventasMeta`)),
      ventasReal: aNumero(formData.get(`fila.${indice}.ventasReal`)),
      unidadesMeta: aNumero(formData.get(`fila.${indice}.unidadesMeta`)),
      unidadesReal: aNumero(formData.get(`fila.${indice}.unidadesReal`)),
      transaccionesMeta: aNumero(formData.get(`fila.${indice}.transaccionesMeta`)),
      transaccionesReal: aNumero(formData.get(`fila.${indice}.transaccionesReal`)),
      margenBrutoMeta: aNumero(formData.get(`fila.${indice}.margenBrutoMeta`)),
      margenBrutoReal: aNumero(formData.get(`fila.${indice}.margenBrutoReal`)),
    };

    await prisma.registroVentas.upsert({
      where: { corteId_tiendaId: { corteId, tiendaId } },
      update: { ...valores, origen: "IA" },
      create: { corteId, tiendaId, ...valores, origen: "IA" },
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
      ventasMeta: aNumero(formData.get(`${tiendaId}.ventasMeta`)),
      ventasReal: aNumero(formData.get(`${tiendaId}.ventasReal`)),
      unidadesMeta: aNumero(formData.get(`${tiendaId}.unidadesMeta`)),
      unidadesReal: aNumero(formData.get(`${tiendaId}.unidadesReal`)),
      transaccionesMeta: aNumero(formData.get(`${tiendaId}.transaccionesMeta`)),
      transaccionesReal: aNumero(formData.get(`${tiendaId}.transaccionesReal`)),
      margenBrutoMeta: aNumero(formData.get(`${tiendaId}.margenBrutoMeta`)),
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
