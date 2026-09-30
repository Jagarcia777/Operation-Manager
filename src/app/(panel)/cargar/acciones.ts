"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TAMANO_MAXIMO, TIPOS_ACEPTADOS, TIPO_EXCEL, metaDeclarada } from "@/lib/carga";
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
import {
  esReporteCategoriasTienda,
  leerCategoriasTienda,
  type LecturaCategoriasTienda,
} from "@/lib/extraccion/categoriasTienda";
import { guardarLibroAjustes } from "@/lib/extraccion/guardarAjustes";
import { guardarCategoriasTienda } from "@/lib/extraccion/guardarCategorias";
import {
  esLibroAjustes,
  leerLibroAjustes,
  type LecturaLibroAjustes,
} from "@/lib/extraccion/libroAjustes";
import { guardarResumenEjecutivo } from "@/lib/extraccion/resumen";
import { textoDePdf } from "@/lib/extraccion/textoPdf";
import { hojasDeExcel } from "@/lib/extraccion/xlsx";
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

/** Marca de las cargas leídas del texto del PDF, sin IA. */
const MODELO_LECTOR_PDF = "LECTOR_PDF";
const MODELO_LECTOR_XLSX = "LECTOR_XLSX";

/**
 * Sube uno o varios documentos. Antes de gastar una lectura con IA se mira si el PDF es un
 * reporte que la aplicación sabe leer por su texto —el de ventas por categoría de una tienda—:
 * ese se lee directo, exacto, sin costo y aunque no haya clave de IA. Así se pueden subir los
 * seis reportes de la zona de una vez.
 */
export async function subirYExtraer(formData: FormData) {
  const corteId = String(formData.get("corteId") ?? "");
  const destino = String(formData.get("destino") ?? "VENTAS");
  const archivos = formData
    .getAll("archivo")
    .filter((archivo): archivo is File => archivo instanceof File && archivo.size > 0);

  // Se responde con un mensaje en la pantalla, no con una excepción: un error de servidor
  // llega al navegador como "Application error" y un archivo equivocado no merece eso.
  if (!archivos.length) redirect("/cargar?error=falta");
  if (archivos.some((archivo) => !TIPOS_ACEPTADOS[archivo.type])) redirect("/cargar?error=tipo");
  if (archivos.reduce((total, archivo) => total + archivo.size, 0) > TAMANO_MAXIMO) {
    redirect("/cargar?error=peso");
  }

  const creadas: string[] = [];
  for (const archivo of archivos) {
    creadas.push(await leerArchivo(archivo, destino, corteId, archivos.length === 1));
  }

  revalidatePath("/cargar");
  redirect(creadas.length === 1 ? `/cargar/${creadas[0]}` : "/cargar");
}

async function leerArchivo(archivo: File, destino: string, corteId: string, unico: boolean) {
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base = {
    archivoNombre: archivo.name,
    archivoTipo: archivo.type,
    archivoContenido: buffer,
  };

  if (archivo.type === "application/pdf") {
    const texto = await textoDePdf(buffer);
    if (esReporteCategoriasTienda(texto)) {
      // El reporte trae su período y crea o encuentra su corte al confirmarlo.
      const extraccion = await prisma.extraccion.create({
        data: {
          ...base,
          destino: "CATEGORIAS",
          estado: "EXTRAIDO",
          modelo: MODELO_LECTOR_PDF,
          respuestaCruda: JSON.stringify(leerCategoriasTienda(texto)),
        },
      });
      return extraccion.id;
    }
  }

  if (archivo.type === TIPO_EXCEL) {
    const hojas = await hojasDeExcel(buffer);
    const conocido = esLibroAjustes(hojas);
    const extraccion = await prisma.extraccion.create({
      data: {
        ...base,
        destino: "LIBRO_AJUSTES",
        modelo: MODELO_LECTOR_XLSX,
        ...(conocido
          ? { estado: "EXTRAIDO", respuestaCruda: JSON.stringify(leerLibroAjustes(hojas)) }
          : {
              estado: "ERROR",
              error:
                "Este libro de Excel no tiene el formato de «Ajustes de inventario vs ventas», " +
                "el único que la aplicación sabe leer. Si trae ventas por tienda, usa Importar CSV.",
            }),
      },
    });
    return extraccion.id;
  }

  // Estos dos solo se leen por su texto. Si el archivo no es el esperado —una foto, un
  // escaneo, otro reporte—, se dice por qué en vez de pedir un corte que la pantalla no muestra.
  const soloLector: Record<string, string> = {
    CATEGORIAS:
      "No se reconoce como el reporte de ventas por categoría de una tienda. Tiene que ser el PDF " +
      "exportado del tablero, con su texto: una foto o un escaneo no se puede leer así.",
    LIBRO_AJUSTES:
      "No se reconoce como el libro «Ajustes de inventario vs ventas». Tiene que ser el archivo de " +
      "Excel (.xlsx) con sus dos hojas.",
  };
  if (soloLector[destino]) {
    const extraccion = await prisma.extraccion.create({
      data: { ...base, destino, estado: "ERROR", error: soloLector[destino] },
    });
    return extraccion.id;
  }

  // El Resumen Ejecutivo trae su propia fecha y crea sus dos cortes —el día y el acumulado del
  // mes—; los demás documentos se cargan contra un corte ya existente.
  const creaSuCorte = destino === "RESUMEN";
  if (!corteId && !creaSuCorte) {
    if (unico) redirect("/cargar?error=falta");
    const extraccion = await prisma.extraccion.create({
      data: {
        ...base,
        destino,
        estado: "ERROR",
        error: "Este documento se carga contra un corte: súbelo solo y elige el corte.",
      },
    });
    return extraccion.id;
  }

  const extraccion = await prisma.extraccion.create({
    data: {
      ...base,
      corteId: creaSuCorte ? null : corteId,
      destino,
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

  return extraccion.id;
}

function aNumero(valor: FormDataEntryValue | null): number | null {
  if (valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/** Columnas del reporte de ajustes que lee la IA; las demás tipologías llegan por el libro. */
const CAMPO_POR_TIPOLOGIA: Partial<Record<Tipologia, string>> = {
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
  if (extraccion.destino === "CATEGORIAS") {
    return confirmarCategorias(extraccion, formData);
  }
  if (extraccion.destino === "LIBRO_AJUSTES") {
    return confirmarLibroAjustes(extraccion.id, extraccion.respuestaCruda);
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
        const campo = CAMPO_POR_TIPOLOGIA[tipologia];
        if (!campo) continue;
        const leido = aNumero(formData.get(`fila.${indice}.${campo}`));
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

async function confirmarCategorias(
  { id: extraccionId, respuestaCruda, creadaEn }: { id: string; respuestaCruda: string | null; creadaEn: Date },
  formData: FormData,
) {
  if (!respuestaCruda) throw new Error("La lectura del documento está vacía.");
  const tiendaId = String(formData.get("tiendaId") ?? "");
  if (!tiendaId) redirect(`/cargar/${extraccionId}?error=tienda`);

  const lectura = JSON.parse(respuestaCruda) as LecturaCategoriasTienda;
  // Todo o nada: el guardado borra y reescribe varias tablas del corte, y quedarse a medias
  // dejaría el corte sin lo viejo y con lo nuevo incompleto.
  const resultado = await prisma.$transaction(
    (tx) => guardarCategoriasTienda(tx, lectura, tiendaId),
    { maxWait: 10_000, timeout: 60_000 },
  );

  await prisma.extraccion.update({
    where: { id: extraccionId },
    data: { estado: "CONFIRMADO", corteId: resultado.corteId },
  });
  await sincronizarAlertas(resultado.corteId);

  revalidatePath("/", "layout");

  // Con varios reportes subidos de una vez, al confirmar uno se pasa directo al siguiente de
  // esa misma subida; uno viejo que alguien dejó sin confirmar no se cuela en la cola.
  const misma = 10 * 60_000;
  const siguiente = await prisma.extraccion.findFirst({
    where: {
      destino: "CATEGORIAS",
      estado: "EXTRAIDO",
      creadaEn: {
        gte: new Date(creadaEn.getTime() - misma),
        lte: new Date(creadaEn.getTime() + misma),
      },
    },
    orderBy: { creadaEn: "asc" },
    select: { id: true },
  });
  redirect(
    siguiente
      ? `/cargar/${siguiente.id}`
      : `/categorias?corte=${resultado.corteId}&tienda=${tiendaId}`,
  );
}

async function confirmarLibroAjustes(extraccionId: string, respuestaCruda: string | null) {
  if (!respuestaCruda) throw new Error("La lectura del libro está vacía.");
  const lectura = JSON.parse(respuestaCruda) as LecturaLibroAjustes;
  const resultado = await prisma.$transaction((tx) => guardarLibroAjustes(tx, lectura), {
    maxWait: 10_000,
    timeout: 60_000,
  });

  await prisma.extraccion.update({
    where: { id: extraccionId },
    data: { estado: "CONFIRMADO", corteId: resultado.corteId },
  });
  await sincronizarAlertas(resultado.corteId);

  revalidatePath("/", "layout");
  redirect(`/ajustes?corte=${resultado.corteId}`);
}
