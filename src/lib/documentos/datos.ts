import type { AnalisisCorteTipo } from "@/lib/analisis/esquema";
import { mediana, proyectarCierre } from "@/lib/calculos";
import { cargarAjustes, cargarTablero, corteAnterior } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";

// Contenido de los documentos de decisión. Se arma una sola vez y lo consumen tanto la vista en
// pantalla como las exportaciones a PowerPoint y Word, para que digan exactamente lo mismo.

export async function datosPresentacionTienda(corteId: string, tiendaId: string) {
  const [corte, tienda, tablero, ajustes] = await Promise.all([
    prisma.corte.findUnique({ where: { id: corteId } }),
    prisma.tienda.findUnique({ where: { id: tiendaId }, include: { zona: true } }),
    cargarTablero(corteId),
    cargarAjustes(corteId),
  ]);
  if (!corte || !tienda) return null;

  const bloqueZona = tablero.zonas.find((zona) => zona.zonaId === tienda.zonaId);
  const fila = bloqueZona?.tiendas.find((entrada) => entrada.tiendaId === tiendaId);
  if (!fila) return null;

  const todasLasTiendas = tablero.zonas.flatMap((zona) => zona.tiendas);
  const ordenadas = [...todasLasTiendas].sort(
    (a, b) => (b.cumplimientoVentas ?? -1) - (a.cumplimientoVentas ?? -1),
  );
  const posicionCadena = ordenadas.findIndex((entrada) => entrada.tiendaId === tiendaId) + 1;

  const enZona = [...(bloqueZona?.tiendas ?? [])].sort(
    (a, b) => (b.cumplimientoVentas ?? -1) - (a.cumplimientoVentas ?? -1),
  );
  const posicionZona = enZona.findIndex((entrada) => entrada.tiendaId === tiendaId) + 1;

  const ajusteTienda = ajustes.zonas
    .flatMap((zona) => zona.tiendas)
    .find((entrada) => entrada.tiendaId === tiendaId);

  const medianasCadena = Object.fromEntries(
    TIPOLOGIAS.map((tipologia) => [
      tipologia,
      mediana(
        ajustes.zonas.flatMap((zona) =>
          zona.tiendas.map((entrada) => entrada.porcentajes[tipologia]),
        ),
      ),
    ]),
  ) as Record<string, number | null>;

  const anterior = await corteAnterior(corte);
  const tableroAnterior = anterior ? await cargarTablero(anterior.id) : null;
  const filaAnterior = tableroAnterior?.zonas
    .flatMap((zona) => zona.tiendas)
    .find((entrada) => entrada.tiendaId === tiendaId);

  const planes = await prisma.planAccion.findMany({
    where: { tiendaId, estado: { not: "CERRADO" } },
    include: { metas: true, hitos: { orderBy: { mes: "asc" } } },
  });

  return {
    corte,
    tienda,
    zona: bloqueZona,
    fila,
    subtotalZona: bloqueZona?.subtotal ?? null,
    totalCadena: tablero.total,
    posicionCadena,
    totalTiendas: todasLasTiendas.length,
    posicionZona,
    tiendasEnZona: enZona.length,
    ajustes: TIPOLOGIAS.map((tipologia) => ({
      tipologia,
      etiqueta: ETIQUETA_TIPOLOGIA[tipologia],
      monto: ajusteTienda?.montos[tipologia] ?? null,
      porcentaje: ajusteTienda?.porcentajes[tipologia] ?? null,
      medianaCadena: medianasCadena[tipologia],
    })),
    ajusteTotal: ajusteTienda?.totalPorcentaje ?? null,
    variacionVentas:
      filaAnterior?.ventasReal && fila.ventasReal
        ? ((fila.ventasReal - filaAnterior.ventasReal) / filaAnterior.ventasReal) * 100
        : null,
    corteAnterior: anterior,
    planes,
  };
}

export type DatosPresentacion = NonNullable<Awaited<ReturnType<typeof datosPresentacionTienda>>>;

export async function datosInformeEjecutivo(corteId: string) {
  const [corte, tablero, ajustes, alertas, analisisGuardado, perfil, benchmarks, umbrales] =
    await Promise.all([
      prisma.corte.findUnique({ where: { id: corteId } }),
      cargarTablero(corteId),
      cargarAjustes(corteId),
      prisma.alerta.findMany({
        where: { corteId, estado: "ABIERTA" },
        include: { tienda: { select: { nombre: true } } },
      }),
      prisma.analisis.findFirst({
        where: { corteId, alcance: "CADENA" },
        orderBy: { creadoEn: "desc" },
      }),
      prisma.perfil.findUnique({ where: { id: "maestro" } }),
      prisma.benchmark.findMany({ orderBy: { etiqueta: "asc" } }),
      prisma.umbral.findMany(),
    ]);
  if (!corte) return null;

  // La zona propia es la que se gestiona al detalle; el resto de la cadena es referencia.
  const zonaPropia =
    tablero.zonas.find((zona) => zona.zonaId === perfil?.zonaPropiaId) ??
    tablero.zonas.find((zona) => zona.detallada) ??
    null;

  const tiendas = (zonaPropia?.tiendas ?? []).map((fila) => ({
    ...fila,
    zona: zonaPropia?.zona ?? "",
  }));
  const ordenadas = [...tiendas].sort(
    (a, b) => (b.cumplimientoVentas ?? -1) - (a.cumplimientoVentas ?? -1),
  );

  const analisis: AnalisisCorteTipo | null = analisisGuardado
    ? (JSON.parse(analisisGuardado.contenido) as AnalisisCorteTipo)
    : null;

  const anterior = await corteAnterior(corte);
  const tableroAnterior = anterior ? await cargarTablero(anterior.id) : null;
  const zonaAnterior = tableroAnterior?.zonas.find(
    (zona) => zona.zonaId === zonaPropia?.zonaId,
  );

  const [categorias, planes] = await Promise.all([
    prisma.registroCategoria.findMany({
      where: {
        corteId,
        ...(zonaPropia ? { tienda: { zonaId: zonaPropia.zonaId } } : {}),
      },
      include: { categoria: true },
    }),
    prisma.planAccion.findMany({
      where: { estado: { not: "CERRADO" } },
      include: { tienda: true, metas: true, hitos: { orderBy: { mes: "asc" } } },
      orderBy: { oportunidadUsd: "desc" },
    }),
  ]);

  const ajustesZona = ajustes.zonas.find((bloque) => bloque.zonaId === zonaPropia?.zonaId);

  return {
    corte,
    corteAnterior: anterior,
    tablero,
    zonaPropia,
    zonaAnterior: zonaAnterior ?? null,
    tiendas,
    ajustes,
    ajustesZona: ajustesZona ?? null,
    categorias,
    planes,
    alertas,
    analisis,
    benchmarks,
    margenMinimo: umbrales.find((umbral) => umbral.clave === "MARGEN_MIN_PCT")?.valor ?? 16,
    mejores: ordenadas.slice(0, 3),
    rezagadas: ordenadas.slice(-3).reverse(),
    proyeccion: proyectarCierre(
      zonaPropia?.subtotal.ventasReal ?? null,
      corte.diasTranscurridos,
      corte.diasDelMes,
    ),
  };
}

export type DatosInforme = NonNullable<Awaited<ReturnType<typeof datosInformeEjecutivo>>>;
