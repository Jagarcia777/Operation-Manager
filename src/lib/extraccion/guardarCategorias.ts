import type { PrismaClient } from "@/generated/prisma/client";
import type { AlertaDetectada } from "@/lib/validacion";
import {
  agruparBajoCosto,
  conciliarPorcentajes,
  esProblemaDeCadena,
  type LecturaCategoriasTienda,
} from "./categoriasTienda";
import { indiceDeCategorias, normalizar } from "./emparejar";
import { etiquetaFecha } from "./resumen";

// Guarda el reporte de ventas por categoría de una tienda. Un archivo alimenta cuatro cosas: la
// mezcla por categoría de la tienda, su margen acumulado —que el Resumen Ejecutivo no publica
// por sucursal—, la lista de productos vendidos a costo o por debajo y las alertas de lo que no
// cuadra contra lo ya cargado.

type Cliente = Pick<
  PrismaClient,
  | "corte"
  | "tienda"
  | "categoria"
  | "registroCategoria"
  | "registroVentas"
  | "productoBajoCosto"
  | "alerta"
>;

/** Diferencia que ya no se explica por el redondeo del reporte. */
const TOLERANCIA_TOTAL_PCT = 0.5;
const TOLERANCIA_MARGEN_PUNTOS = 0.05;

function fecha(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

/**
 * El corte sale del período impreso, con el mismo nombre que le pone el Resumen Ejecutivo: así
 * el reporte de la tienda cae en el mismo "Acumulado al 13/09/2026" que el informe de la cadena
 * y se pueden comparar, sin pedirle a nadie que elija un corte que el documento ya dice.
 */
export function datosDelCorte(desde: string, hasta: string) {
  const inicio = fecha(desde);
  const fin = fecha(hasta);
  const esAcumulado =
    inicio.getUTCDate() === 1 &&
    inicio.getUTCMonth() === fin.getUTCMonth() &&
    inicio.getUTCFullYear() === fin.getUTCFullYear();

  if (esAcumulado) {
    return {
      nombre: `Acumulado al ${etiquetaFecha(fin)}`,
      tipo: "ACUMULADO_MES",
      diasTranscurridos: fin.getUTCDate(),
    };
  }
  if (desde === hasta) return { nombre: etiquetaFecha(fin), tipo: "DIARIO", diasTranscurridos: 1 };
  return {
    nombre: `Del ${etiquetaFecha(inicio).slice(0, 5)} al ${etiquetaFecha(fin)}`,
    tipo: "SEMANAL",
    diasTranscurridos: Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1,
  };
}

export async function corteDelPeriodo(
  prisma: Pick<PrismaClient, "corte">,
  desde: string,
  hasta: string,
) {
  const inicio = fecha(desde);
  const fin = fecha(hasta);
  const diasDelMes = new Date(
    Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const datos = datosDelCorte(desde, hasta);

  return prisma.corte.upsert({
    where: { nombre: datos.nombre },
    update: {},
    create: { ...datos, fechaInicio: inicio, fechaFin: fin, diasDelMes, estado: "REVISION" },
  });
}

export type ResultadoCategorias = {
  corteId: string;
  categoriasGuardadas: number;
  categoriasSinCatalogo: string[];
  productosBajoCosto: number;
  alertas: number;
};

const formato = (valor: number) => Math.round(valor).toLocaleString("es-VE");

export async function guardarCategoriasTienda(
  prisma: Cliente,
  lectura: LecturaCategoriasTienda,
  tiendaId: string,
): Promise<ResultadoCategorias> {
  if (!lectura.desde || !lectura.hasta) throw new Error("El reporte no trae su período.");
  const corte = await corteDelPeriodo(prisma, lectura.desde, lectura.hasta);
  const tienda = await prisma.tienda.findUniqueOrThrow({ where: { id: tiendaId } });
  const alertas: AlertaDetectada[] = [];

  // ── Mezcla por categoría ────────────────────────────────────────────────────
  // Dos filas del reporte pueden caer en la misma categoría del catálogo por sus alias: se
  // suman, con el margen ponderado por venta y no promediado.
  const porNombre = indiceDeCategorias(await prisma.categoria.findMany());
  const acumulado = new Map<
    string,
    { ventas: number; unidades: number; margenUsd: number; conMargen: number }
  >();
  const sinCatalogo: { categoria: string; ventas: number }[] = [];

  for (const fila of lectura.categorias) {
    const categoria = porNombre.get(normalizar(fila.categoria));
    if (!categoria) {
      sinCatalogo.push({ categoria: fila.categoria, ventas: fila.ventas ?? 0 });
      continue;
    }
    const actual = acumulado.get(categoria.id) ?? {
      ventas: 0,
      unidades: 0,
      margenUsd: 0,
      conMargen: 0,
    };
    actual.ventas += fila.ventas ?? 0;
    actual.unidades += fila.unidades ?? 0;
    if (fila.margen !== null && fila.ventas !== null) {
      actual.margenUsd += (fila.margen / 100) * fila.ventas;
      actual.conMargen += fila.ventas;
    }
    acumulado.set(categoria.id, actual);
  }

  await prisma.registroCategoria.deleteMany({ where: { corteId: corte.id, tiendaId } });
  await prisma.registroCategoria.createMany({
    data: [...acumulado].map(([categoriaId, valores]) => ({
      corteId: corte.id,
      tiendaId,
      categoriaId,
      ventasReal: valores.ventas,
      unidadesReal: valores.unidades,
      margenBrutoReal: valores.conMargen ? (valores.margenUsd / valores.conMargen) * 100 : null,
      origen: "PDF",
    })),
  });

  // Lo que no está en el catálogo no se descarta callado: la venta existe y falta en la mezcla.
  const ventaSinCatalogo = sinCatalogo.reduce((total, fila) => total + fila.ventas, 0);
  if (sinCatalogo.length) {
    alertas.push({
      tipo: "DATO_FALTANTE",
      severidad: ventaSinCatalogo > (lectura.total.ventas ?? 0) * 0.01 ? "MEDIA" : "BAJA",
      tiendaId,
      indicador: "CATEGORIA_SIN_CATALOGO",
      valorObservado: Math.round(ventaSinCatalogo),
      valorEsperado: 0,
      mensaje:
        `${tienda.nombre}: ${sinCatalogo.map((fila) => fila.categoria).join(", ")} no está en el ` +
        `catálogo de categorías y quedó fuera de la mezcla (${formato(ventaSinCatalogo)} $). ` +
        `Agrégala en Configuración, o como alias de una existente, y vuelve a cargar el reporte.`,
    });
  }

  // ── Total y margen de la tienda ─────────────────────────────────────────────
  const registro = await prisma.registroVentas.findUnique({
    where: { corteId_tiendaId: { corteId: corte.id, tiendaId } },
  });
  const { ventas, unidades, margen } = lectura.total;

  if (!registro) {
    await prisma.registroVentas.create({
      data: {
        corteId: corte.id,
        tiendaId,
        ventasReal: ventas,
        unidadesReal: unidades,
        margenBrutoReal: margen,
        origen: "PDF",
      },
    });
  } else {
    for (const [etiqueta, impreso, cargado] of [
      ["Venta", ventas, registro.ventasReal],
      ["Unidades", unidades, registro.unidadesReal],
    ] as const) {
      if (impreso === null || !cargado) continue;
      const desvio = ((impreso - cargado) / cargado) * 100;
      if (Math.abs(desvio) <= TOLERANCIA_TOTAL_PCT) continue;
      alertas.push({
        tipo: "SUBTOTAL_DESCUADRADO",
        severidad: "ALTA",
        tiendaId,
        indicador: `${etiqueta.toUpperCase()}_REPORTE_CATEGORIAS`,
        valorObservado: Math.round(impreso),
        valorEsperado: Math.round(cargado),
        mensaje:
          `${tienda.nombre}: el reporte por categoría da ${etiqueta.toLowerCase()} de ${formato(impreso)} ` +
          `y el corte tiene cargado ${formato(cargado)}. Uno de los dos documentos no cubre el mismo período o el mismo alcance.`,
      });
    }

    // El margen acumulado por tienda solo llega en este reporte: si falta, se completa; si ya
    // hay uno distinto, no se pisa, se levanta la diferencia.
    if (margen !== null && registro.margenBrutoReal === null) {
      await prisma.registroVentas.update({
        where: { id: registro.id },
        data: { margenBrutoReal: margen },
      });
    } else if (
      margen !== null &&
      Math.abs(margen - registro.margenBrutoReal!) > TOLERANCIA_MARGEN_PUNTOS
    ) {
      alertas.push({
        tipo: "INDICADOR_NO_CUADRA",
        severidad: "MEDIA",
        tiendaId,
        indicador: "MARGEN_REPORTE_CATEGORIAS",
        valorObservado: margen,
        valorEsperado: registro.margenBrutoReal,
        mensaje:
          `${tienda.nombre}: el reporte por categoría da un margen de ${margen.toFixed(2)} % y el corte ` +
          `tiene ${registro.margenBrutoReal!.toFixed(2)} %. Se conserva el cargado hasta que alguien confirme cuál vale.`,
      });
    }
  }

  const porcentajes = conciliarPorcentajes(lectura, tienda.nombre);
  if (porcentajes) alertas.push(porcentajes);

  // ── Productos vendidos a costo o por debajo ─────────────────────────────────
  await prisma.productoBajoCosto.deleteMany({ where: { corteId: corte.id, tiendaId } });
  await prisma.productoBajoCosto.createMany({
    data: lectura.bajoCosto.map((producto) => ({
      corteId: corte.id,
      tiendaId,
      codigo: producto.codigo,
      producto: producto.producto,
    })),
    skipDuplicates: true,
  });

  const [todos, tiendasCargadas] = await Promise.all([
    prisma.productoBajoCosto.findMany({
      where: { corteId: corte.id },
      include: { tienda: { select: { nombre: true } } },
    }),
    prisma.registroCategoria.findMany({
      where: { corteId: corte.id, tiendaId: { not: null } },
      distinct: ["tiendaId"],
      select: { tiendaId: true },
    }),
  ]);
  const grupos = agruparBajoCosto(
    todos.map((registro) => ({
      codigo: registro.codigo,
      producto: registro.producto,
      tienda: registro.tienda.nombre,
    })),
  );
  const deCadena = grupos.filter((grupo) => esProblemaDeCadena(grupo.tiendas.length));
  for (const grupo of deCadena) {
    alertas.push({
      tipo: "VENTA_BAJO_COSTO",
      severidad: "ALTA",
      tiendaId: null,
      indicador: grupo.codigo,
      valorObservado: grupo.tiendas.length,
      valorEsperado: tiendasCargadas.length,
      mensaje:
        `${grupo.producto} (${grupo.codigo}) se vende a costo o por debajo en ${grupo.tiendas.length} ` +
        `de ${tiendasCargadas.length} tiendas cargadas: ${grupo.tiendas.join(", ")}. Repetido en ` +
        `varias tiendas no es un problema de una tienda sino del precio o del costo cargado para la ` +
        `cadena, y se corrige en un solo lugar.`,
    });
  }

  // Una alerta de cadena abierta que ya no se cumple —se recargó un reporte corregido— se
  // retira: dejarla diría que el producto sigue bajo costo en tiendas donde ya no lo está. Las
  // que alguien revisó o descartó quedan como constancia.
  await prisma.alerta.deleteMany({
    where: {
      corteId: corte.id,
      tipo: "VENTA_BAJO_COSTO",
      estado: "ABIERTA",
      indicador: { notIn: deCadena.map((grupo) => grupo.codigo) },
    },
  });

  const guardadas = await registrarAlertas(prisma, corte.id, alertas);

  return {
    corteId: corte.id,
    categoriasGuardadas: acumulado.size,
    categoriasSinCatalogo: sinCatalogo.map((fila) => fila.categoria),
    productosBajoCosto: lectura.bajoCosto.length,
    alertas: guardadas,
  };
}

/**
 * Crea las alertas nuevas y pone al día las que siguen abiertas con la misma firma —el conteo
 * de tiendas de un producto bajo costo crece a medida que se cargan reportes—. Lo que alguien ya
 * revisó o descartó no se toca ni se vuelve a levantar.
 */
async function registrarAlertas(
  prisma: Pick<PrismaClient, "alerta">,
  corteId: string,
  alertas: AlertaDetectada[],
) {
  if (!alertas.length) return 0;
  const existentes = await prisma.alerta.findMany({ where: { corteId } });
  const firma = (alerta: { tipo: string; tiendaId: string | null; indicador: string | null }) =>
    `${alerta.tipo}|${alerta.tiendaId ?? ""}|${alerta.indicador ?? ""}`;
  const porFirma = new Map(existentes.map((alerta) => [firma(alerta), alerta]));

  let tocadas = 0;
  for (const alerta of alertas) {
    const existente = porFirma.get(firma(alerta));
    if (!existente) {
      await prisma.alerta.create({ data: { ...alerta, corteId } });
      tocadas += 1;
    } else if (existente.estado === "ABIERTA") {
      await prisma.alerta.update({
        where: { id: existente.id },
        data: {
          mensaje: alerta.mensaje,
          valorObservado: alerta.valorObservado,
          valorEsperado: alerta.valorEsperado,
        },
      });
      tocadas += 1;
    }
  }
  return tocadas;
}
