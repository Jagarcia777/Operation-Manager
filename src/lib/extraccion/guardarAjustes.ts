import type { PrismaClient } from "@/generated/prisma/client";
import type { AlertaDetectada } from "@/lib/validacion";
import { emparejarTienda, indiceDeCategorias, normalizar } from "./emparejar";
import { corteDelPeriodo, registrarAlertas } from "./guardarCategorias";
import type { CategoriaLibro, LecturaLibroAjustes } from "./libroAjustes";

// Guarda el libro de ajustes vs ventas. De cada tienda de la zona entra el ajuste por
// tipología en dólares y en unidades, con la venta del mismo período para medirlo; de la
// cadena, el total y la apertura por tipología como línea de comparación; de los centros de
// distribución, sus unidades ajustadas; y por categoría, el ajuste de cada tienda y el de la
// cadena. Los porcentajes del libro no se guardan: se derivan.

type Cliente = Pick<
  PrismaClient,
  | "corte"
  | "zona"
  | "tienda"
  | "categoria"
  | "registroVentas"
  | "registroAjuste"
  | "registroAjusteCategoria"
  | "ajusteReferencia"
  | "alerta"
>;

const TOLERANCIA_VENTA_PCT = 0.5;
/** Cuánto puede alejarse la venta diaria del libro del ritmo conocido antes de dudar del período. */
const DESVIO_RITMO = 0.35;

const miles = (valor: number) => Math.round(valor).toLocaleString("es-VE");

export type ResultadoLibro = {
  corteId: string;
  tiendasGuardadas: number;
  tiendasSinEmparejar: string[];
  alertas: number;
};

export async function guardarLibroAjustes(
  prisma: Cliente,
  lectura: LecturaLibroAjustes,
): Promise<ResultadoLibro> {
  if (!lectura.desde || !lectura.hasta) throw new Error("El libro no trae su período.");
  const corte = await corteDelPeriodo(prisma, lectura.desde, lectura.hasta);
  const [catalogo, zonaPropia, categorias] = await Promise.all([
    prisma.tienda.findMany({ select: { id: true, nombre: true, codigo: true, alias: true } }),
    prisma.zona.findFirst({ where: { detallada: true }, orderBy: { orden: "asc" } }),
    prisma.categoria.findMany(),
  ]);
  const porNombre = indiceDeCategorias(categorias);
  const alertas: AlertaDetectada[] = lectura.observaciones.map((hallazgo) => ({
    tipo: hallazgo.tipo,
    severidad: hallazgo.tipo === "INDICADOR_NO_CUADRA" ? "MEDIA" : "ALTA",
    tiendaId: null,
    indicador: hallazgo.indicador,
    valorObservado: null,
    valorEsperado: null,
    mensaje: hallazgo.mensaje,
  }));

  // ── Tiendas de la zona: venta y ajuste por tipología ────────────────────────
  const sinEmparejar: string[] = [];
  const ventaLibro = new Map<string, number>();
  for (const tienda of lectura.tiendas) {
    const { tiendaId } = emparejarTienda(tienda.nombre, catalogo);
    if (!tiendaId) {
      sinEmparejar.push(tienda.nombre);
      continue;
    }
    if (tienda.ventas !== null) ventaLibro.set(tiendaId, tienda.ventas);

    const registro = await prisma.registroVentas.findUnique({
      where: { corteId_tiendaId: { corteId: corte.id, tiendaId } },
    });
    if (!registro && tienda.ventas !== null) {
      await prisma.registroVentas.create({
        data: { corteId: corte.id, tiendaId, ventasReal: tienda.ventas, origen: "XLSX" },
      });
    } else if (registro?.ventasReal && tienda.ventas !== null) {
      const desvio = ((tienda.ventas - registro.ventasReal) / registro.ventasReal) * 100;
      if (Math.abs(desvio) > TOLERANCIA_VENTA_PCT) {
        alertas.push({
          tipo: "SUBTOTAL_DESCUADRADO",
          severidad: "ALTA",
          tiendaId,
          indicador: "VENTA_LIBRO_AJUSTES",
          valorObservado: Math.round(tienda.ventas),
          valorEsperado: Math.round(registro.ventasReal),
          mensaje:
            `${tienda.nombre}: el libro de ajustes usa una venta de ${miles(tienda.ventas)} y el corte ` +
            `tiene ${miles(registro.ventasReal)}. El % de ajuste se mide contra la del corte.`,
        });
      }
    }

    const base = registro?.ventasReal ?? tienda.ventas;
    await prisma.registroAjuste.deleteMany({ where: { corteId: corte.id, tiendaId } });
    await prisma.registroAjuste.createMany({
      data: tienda.tipologias.flatMap((ajuste) =>
        ajuste.tipologia
          ? [
              {
                corteId: corte.id,
                tiendaId,
                tipologia: ajuste.tipologia,
                monto: ajuste.monto ?? 0,
                unidades: ajuste.unidades,
                porcentaje: base && ajuste.monto !== null ? (ajuste.monto / base) * 100 : null,
                origen: "XLSX",
              },
            ]
          : [],
      ),
      skipDuplicates: true,
    });
  }
  if (sinEmparejar.length) {
    alertas.push({
      tipo: "DATO_FALTANTE",
      severidad: "ALTA",
      tiendaId: null,
      indicador: "TIENDA_LIBRO_AJUSTES",
      valorObservado: sinEmparejar.length,
      valorEsperado: 0,
      mensaje: `El libro trae ${sinEmparejar.join(", ")} y no se reconocen en el catálogo: sus ajustes no se guardaron.`,
    });
  }

  const periodo = await revisarPeriodoDeVenta(prisma, corte, ventaLibro);
  if (periodo) alertas.push(periodo);

  // ── Cadena y centros de distribución ────────────────────────────────────────
  await prisma.ajusteReferencia.deleteMany({ where: { corteId: corte.id } });
  await prisma.ajusteReferencia.createMany({
    data: [
      {
        corteId: corte.id,
        ambito: "CADENA",
        nombre: "Toda la cadena",
        tipologia: "TOTAL",
        ...lectura.cadena,
      },
      ...lectura.tipologiasCadena.flatMap((ajuste) =>
        ajuste.tipologia
          ? [
              {
                corteId: corte.id,
                ambito: "CADENA",
                nombre: "Toda la cadena",
                tipologia: ajuste.tipologia,
                unidades: ajuste.unidades,
                monto: ajuste.monto,
              },
            ]
          : [],
      ),
      ...lectura.sucursales
        .filter((sucursal) => sucursal.esCentro)
        .map((centro) => ({
          corteId: corte.id,
          ambito: "CENTRO_DISTRIBUCION",
          nombre: centro.nombre,
          // La ★ del libro marca lo que pertenece a la zona o la abastece.
          zonaId: centro.deLaZona ? (zonaPropia?.id ?? null) : null,
          tipologia: "TOTAL",
          unidades: centro.unidades,
        })),
    ],
    skipDuplicates: true,
  });

  // ── Ajuste por categoría ────────────────────────────────────────────────────
  const sinCatalogo = new Set<string>();
  const filasCategoria = (filas: CategoriaLibro[]) => {
    const acumulado = new Map<string, { ventas: number; unidades: number; monto: number }>();
    for (const fila of filas) {
      const categoria = porNombre.get(normalizar(fila.categoria));
      if (!categoria) {
        sinCatalogo.add(fila.categoria);
        continue;
      }
      const actual = acumulado.get(categoria.id) ?? { ventas: 0, unidades: 0, monto: 0 };
      actual.ventas += fila.ventas ?? 0;
      actual.unidades += fila.unidades ?? 0;
      actual.monto += fila.monto ?? 0;
      acumulado.set(categoria.id, actual);
    }
    return [...acumulado];
  };

  // Sin tienda no hay índice único que proteja de duplicados: se reemplaza el juego completo.
  await prisma.registroAjusteCategoria.deleteMany({ where: { corteId: corte.id, tiendaId: null } });
  await prisma.registroAjusteCategoria.createMany({
    data: filasCategoria(lectura.categoriasCadena).map(([categoriaId, valores]) => ({
      corteId: corte.id,
      tiendaId: null,
      categoriaId,
      ...valores,
    })),
  });
  for (const bloque of lectura.categoriasTiendas) {
    const { tiendaId } = emparejarTienda(bloque.tienda, catalogo);
    if (!tiendaId) continue;
    await prisma.registroAjusteCategoria.deleteMany({ where: { corteId: corte.id, tiendaId } });
    await prisma.registroAjusteCategoria.createMany({
      data: filasCategoria(bloque.categorias).map(([categoriaId, valores]) => ({
        corteId: corte.id,
        tiendaId,
        categoriaId,
        ...valores,
      })),
    });
  }
  if (sinCatalogo.size) {
    alertas.push({
      tipo: "DATO_FALTANTE",
      severidad: "BAJA",
      tiendaId: null,
      indicador: "CATEGORIA_AJUSTE_SIN_CATALOGO",
      valorObservado: sinCatalogo.size,
      valorEsperado: 0,
      mensaje:
        sinCatalogo.size === 1
          ? `${[...sinCatalogo][0]} trae ajustes pero no está en el catálogo de categorías: queda ` +
            `fuera del ajuste por categoría. Agrégala en Configuración y vuelve a cargar el libro.`
          : `${[...sinCatalogo].join(", ")} traen ajustes pero no están en el catálogo de ` +
            `categorías: quedan fuera del ajuste por categoría. Agrégalas en Configuración y ` +
            `vuelve a cargar el libro.`,
    });
  }

  const guardadas = await registrarAlertas(prisma, corte.id, alertas);
  return {
    corteId: corte.id,
    tiendasGuardadas: lectura.tiendas.length - sinEmparejar.length,
    tiendasSinEmparejar: sinEmparejar,
    alertas: guardadas,
  };
}

/**
 * ¿La venta del libro es de los mismos días que sus ajustes? Se compara su venta diaria con el
 * ritmo de las mismas tiendas en el corte más reciente que la aplicación conoce. Si el libro
 * dice una semana y su venta alcanza para diez días, el % de ajuste sobre ventas queda
 * subestimado, y eso hay que saberlo antes de comparar.
 */
async function revisarPeriodoDeVenta(
  prisma: Pick<PrismaClient, "corte" | "registroVentas">,
  corte: { id: string; diasTranscurridos: number | null },
  ventaLibro: Map<string, number>,
): Promise<AlertaDetectada | null> {
  const dias = corte.diasTranscurridos;
  const tiendaIds = [...ventaLibro.keys()];
  if (!dias || !tiendaIds.length) return null;

  const referencia = await prisma.corte.findFirst({
    where: {
      id: { not: corte.id },
      diasTranscurridos: { gt: 1 },
      ventas: { some: { tiendaId: { in: tiendaIds }, ventasReal: { not: null } } },
    },
    orderBy: { fechaFin: "desc" },
    include: { ventas: { where: { tiendaId: { in: tiendaIds } } } },
  });
  if (!referencia?.diasTranscurridos) return null;

  const comunes = referencia.ventas.filter((registro) => registro.ventasReal);
  if (comunes.length < tiendaIds.length / 2) return null;
  const ritmo =
    comunes.reduce((total, registro) => total + registro.ventasReal!, 0) / referencia.diasTranscurridos;
  const delLibro = comunes.reduce((total, registro) => total + (ventaLibro.get(registro.tiendaId) ?? 0), 0);
  if (!ritmo || !delLibro) return null;

  const diasEquivalentes = delLibro / ritmo;
  if (Math.abs(diasEquivalentes / dias - 1) <= DESVIO_RITMO) return null;

  return {
    tipo: "INDICADOR_NO_CUADRA",
    severidad: "ALTA",
    tiendaId: null,
    indicador: "PERIODO_VENTA_LIBRO",
    valorObservado: Number(diasEquivalentes.toFixed(1)),
    valorEsperado: dias,
    mensaje:
      `El libro dice ${dias} días, pero la venta que trae para ${comunes.length} tiendas ` +
      `(${miles(delLibro)} $) equivale a ${diasEquivalentes.toFixed(1).replace(".", ",")} días al ritmo de ` +
      `${referencia.nombre} (${miles(ritmo)} $ diarios). Si la venta cubre más días que los ajustes, ` +
      `el % de ajuste sobre ventas sale menor de lo que es: confirmar el período de la venta.`,
  };
}
