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

export type SerieTienda = {
  tiendaId: string;
  tienda: string;
  /** Un valor por corte, en el mismo orden que `etiquetas`. Null donde la tienda no operaba. */
  ventas: (number | null)[];
  ticket: (number | null)[];
  margen: (number | null)[];
  logro: (number | null)[];
};

export type ComparativaMensual = {
  etiquetas: string[];
  tiendas: SerieTienda[];
};

/**
 * Evolución mes a mes de cada tienda de la zona propia. Es lo que el gráfico de la zona no
 * puede contestar: si la zona sube porque suben todas o porque una tapa a otra.
 *
 * Solo cierres de mes y en el mismo orden para todas, de modo que las columnas de la tabla y
 * los puntos del gráfico signifiquen lo mismo en cada fila. Una tienda que todavía no había
 * abierto va con null y no con cero: cero diría que vendió nada, y no es lo mismo.
 */
export async function comparativaMensual(limite = 6): Promise<ComparativaMensual> {
  const cortes = await prisma.corte.findMany({
    where: { tipo: "CIERRE_MES" },
    orderBy: { fechaFin: "desc" },
    take: limite,
  });
  if (!cortes.length) return { etiquetas: [], tiendas: [] };

  const ordenados = cortes.slice().reverse();
  const [perfil, registros] = await Promise.all([
    prisma.perfil.findUnique({ where: { id: "maestro" } }),
    prisma.registroVentas.findMany({
      where: { corteId: { in: ordenados.map((corte) => corte.id) } },
      include: { tienda: { select: { id: true, nombre: true, zonaId: true, orden: true } } },
    }),
  ]);

  const zonaPropia = perfil?.zonaPropiaId ?? null;
  const propios = zonaPropia
    ? registros.filter((registro) => registro.tienda.zonaId === zonaPropia)
    : registros;

  const catalogo = new Map<string, { nombre: string; orden: number }>();
  for (const registro of propios) {
    catalogo.set(registro.tienda.id, {
      nombre: registro.tienda.nombre,
      orden: registro.tienda.orden,
    });
  }

  const porClave = new Map(propios.map((r) => [`${r.corteId}:${r.tiendaId}`, r]));

  const tiendas = [...catalogo.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([tiendaId, datos]) => {
      const filas = ordenados.map((corte) => porClave.get(`${corte.id}:${tiendaId}`) ?? null);
      return {
        tiendaId,
        tienda: datos.nombre,
        ventas: filas.map((fila) => fila?.ventasReal ?? null),
        ticket: filas.map((fila) =>
          fila?.ventasReal && fila.transaccionesReal
            ? fila.ventasReal / fila.transaccionesReal
            : null,
        ),
        margen: filas.map((fila) => fila?.margenBrutoReal ?? null),
        logro: filas.map((fila) =>
          fila?.ventasReal && fila.ventasMeta ? (fila.ventasReal / fila.ventasMeta) * 100 : null,
        ),
      };
    });

  return { etiquetas: ordenados.map((corte) => etiquetaCorta(corte.nombre)), tiendas };
}
