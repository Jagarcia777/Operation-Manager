import { prisma } from "@/lib/db";
import { construirAjustes, construirTablero } from "@/lib/calculos";

export async function listarCortes() {
  return prisma.corte.findMany({ orderBy: { fechaFin: "desc" } });
}

/** Resuelve el corte pedido; si no viene ninguno, toma el más reciente. */
export async function resolverCorte(corteId?: string) {
  if (corteId) {
    const corte = await prisma.corte.findUnique({ where: { id: corteId } });
    if (corte) return corte;
  }
  return prisma.corte.findFirst({ orderBy: { fechaFin: "desc" } });
}

export async function cargarTiendas() {
  return prisma.tienda.findMany({
    where: { activa: true },
    include: { zona: true },
    orderBy: [{ zona: { orden: "asc" } }, { orden: "asc" }],
  });
}

export async function cargarTablero(corteId: string) {
  const [tiendas, registros, agregados] = await Promise.all([
    cargarTiendas(),
    prisma.registroVentas.findMany({ where: { corteId } }),
    prisma.registroZona.findMany({ where: { corteId }, include: { zona: true } }),
  ]);

  return construirTablero(
    tiendas,
    registros,
    agregados.map((registro) => ({
      zonaId: registro.zonaId,
      zona: registro.zona.nombre,
      gerente: registro.zona.gerente,
      orden: registro.zona.orden,
      ventasMeta: registro.ventasMeta,
      ventasReal: registro.ventasReal,
      unidadesMeta: registro.unidadesMeta,
      unidadesReal: registro.unidadesReal,
      transaccionesMeta: registro.transaccionesMeta,
      transaccionesReal: registro.transaccionesReal,
      margenBrutoMeta: registro.margenBrutoMeta,
      margenBrutoReal: registro.margenBrutoReal,
    })),
  );
}

export async function cargarAjustes(corteId: string) {
  const [tiendas, ajustes, registros] = await Promise.all([
    cargarTiendas(),
    prisma.registroAjuste.findMany({ where: { corteId } }),
    prisma.registroVentas.findMany({ where: { corteId } }),
  ]);
  const ventasPorTienda = new Map(
    registros.map((registro) => [registro.tiendaId, registro.ventasReal]),
  );
  return construirAjustes(tiendas, ajustes, ventasPorTienda);
}

/** Corte inmediatamente anterior al indicado, para los comparativos. */
export async function corteAnterior(corte: { fechaFin: Date; tipo: string }) {
  return prisma.corte.findFirst({
    where: { fechaFin: { lt: corte.fechaFin }, tipo: corte.tipo },
    orderBy: { fechaFin: "desc" },
  });
}

export type PuntoSerie = {
  corteId: string;
  etiqueta: string;
  ventasMeta: number | null;
  ventasReal: number | null;
  margenBrutoReal: number | null;
  transaccionesReal: number | null;
  ticket: number | null;
};

/**
 * Serie histórica de la zona propia, cierre de mes a cierre de mes. Es la base de los
 * gráficos de evolución: solo se comparan cortes del mismo tipo, porque un acumulado a
 * mitad de mes contra un mes cerrado mediría días y no desempeño.
 */
export async function serieMensual(limite = 12): Promise<PuntoSerie[]> {
  const cortes = await prisma.corte.findMany({
    where: { tipo: "CIERRE_MES" },
    orderBy: { fechaFin: "desc" },
    take: limite,
  });
  if (!cortes.length) return [];

  const ids = cortes.map((corte) => corte.id);
  const [perfil, registros] = await Promise.all([
    prisma.perfil.findUnique({ where: { id: "maestro" } }),
    prisma.registroVentas.findMany({
      where: { corteId: { in: ids } },
      include: { tienda: { select: { zonaId: true } } },
    }),
  ]);

  const zonaPropia = perfil?.zonaPropiaId ?? null;
  const porCorte = new Map<string, typeof registros>();
  for (const registro of registros) {
    if (zonaPropia && registro.tienda.zonaId !== zonaPropia) continue;
    const lista = porCorte.get(registro.corteId) ?? [];
    lista.push(registro);
    porCorte.set(registro.corteId, lista);
  }

  const sumar = (lista: typeof registros, campo: "ventasMeta" | "ventasReal" | "transaccionesReal") => {
    const validos = lista.filter((registro) => registro[campo] !== null);
    if (!validos.length) return null;
    return validos.reduce((total, registro) => total + (registro[campo] ?? 0), 0);
  };

  return cortes
    .slice()
    .reverse()
    .map((corte) => {
      const lista = porCorte.get(corte.id) ?? [];
      const ventasReal = sumar(lista, "ventasReal");
      const transacciones = sumar(lista, "transaccionesReal");

      // El margen de un conjunto se pondera por venta: promediar porcentajes falsea el total.
      const conMargen = lista.filter(
        (registro) => registro.margenBrutoReal !== null && registro.ventasReal !== null,
      );
      const ventaConMargen = conMargen.reduce((total, r) => total + (r.ventasReal ?? 0), 0);
      const margen = ventaConMargen
        ? conMargen.reduce((total, r) => total + (r.ventasReal ?? 0) * (r.margenBrutoReal ?? 0), 0) /
          ventaConMargen
        : null;

      return {
        corteId: corte.id,
        // "Diciembre 2025" no cabe en un eje: se queda en "Dic 25".
        etiqueta: etiquetaCorta(corte.nombre),
        ventasMeta: sumar(lista, "ventasMeta"),
        ventasReal,
        margenBrutoReal: margen,
        transaccionesReal: transacciones,
        ticket: ventasReal && transacciones ? ventasReal / transacciones : null,
      };
    });
}

const ABREVIATURA_MES: Record<string, string> = {
  enero: "Ene", febrero: "Feb", marzo: "Mar", abril: "Abr",
  mayo: "May", junio: "Jun", julio: "Jul", agosto: "Ago",
  septiembre: "Sep", octubre: "Oct", noviembre: "Nov", diciembre: "Dic",
};

function etiquetaCorta(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const mes = ABREVIATURA_MES[partes[0]?.toLowerCase() ?? ""];
  if (!mes) return nombre.length > 10 ? `${nombre.slice(0, 9)}…` : nombre;
  const anio = partes[1]?.slice(-2) ?? "";
  return anio ? `${mes} ${anio}` : mes;
}
