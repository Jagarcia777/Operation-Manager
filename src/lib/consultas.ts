import { prisma } from "@/lib/db";
import { construirAjustes, construirTablero } from "@/lib/calculos";
import { calcularPlantilla, type AreaDefinicion } from "@/lib/plantilla";

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

export async function cargarAreas() {
  return prisma.areaOperativa.findMany({
    where: { activa: true },
    orderBy: { orden: "asc" },
  });
}

function aDefinicion(area: {
  id: string;
  nombre: string;
  kpi: string;
  estandar: number | null;
  estandarMin: number | null;
  estandarMax: number | null;
  usaVentaTienda: boolean;
  orden: number;
}): AreaDefinicion {
  return {
    id: area.id,
    nombre: area.nombre,
    kpi: area.kpi as AreaDefinicion["kpi"],
    estandar: area.estandar,
    estandarMin: area.estandarMin,
    estandarMax: area.estandarMax,
    usaVentaTienda: area.usaVentaTienda,
    orden: area.orden,
  };
}

/**
 * Eficiencia de la plantilla en un corte. Se consolida por tienda y no de una sola pasada:
 * la venta que se le presta al área administrativa es la de su propia tienda, y juntar
 * todas las tiendas antes de calcular le prestaría la de la zona entera.
 */
export async function cargarPlantilla(corteId: string, tiendaId?: string) {
  const [areas, tiendas, registros, ventas] = await Promise.all([
    cargarAreas(),
    cargarTiendas(),
    prisma.registroPlantilla.findMany({
      where: { corteId, ...(tiendaId ? { tiendaId } : {}) },
    }),
    // La venta del corte es el denominador del costo de nómina y la base del área que se mide
    // contra toda la tienda. Ya está capturada en el tablero: pedirla otra vez sería invitar a
    // que las dos pantallas dijeran cosas distintas.
    prisma.registroVentas.findMany({
      where: { corteId, ...(tiendaId ? { tiendaId } : {}) },
      select: { tiendaId: true, ventasReal: true },
    }),
  ]);

  const ventaPorTienda = new Map(ventas.map((venta) => [venta.tiendaId, venta.ventasReal]));

  const definiciones = areas.map(aDefinicion);
  const alcanzadas = tiendaId ? tiendas.filter((tienda) => tienda.id === tiendaId) : tiendas;

  const porTienda = alcanzadas
    .map((tienda) => ({
      tiendaId: tienda.id,
      tienda: tienda.nombre,
      zona: tienda.zona.nombre,
      resumen: calcularPlantilla(
        definiciones,
        registros
          .filter((registro) => registro.tiendaId === tienda.id)
          .map((registro) => ({
            areaId: registro.areaId,
            plantillaMeta: registro.plantillaMeta,
            plantillaActiva: registro.plantillaActiva,
            horasProgramadas: registro.horasProgramadas,
            horasTrabajadas: registro.horasTrabajadas,
            horasAusentismo: registro.horasAusentismo,
            horasExtra: registro.horasExtra,
            ventas: registro.ventas,
            unidades: registro.unidades,
            transacciones: registro.transacciones,
            costoNomina: registro.costoNomina,
          })),
        ventaPorTienda.get(tienda.id) ?? null,
      ),
    }))
    .filter((fila) => fila.resumen.areasConDatos > 0);

  // Agregado del alcance: se suman las capturas por área y se calcula una sola vez, para que
  // el área que se mide contra la venta de la tienda reciba la venta del conjunto y no la de
  // una sucursal suelta. Sumar los índices ya calculados daría un promedio sin ponderar.
  const agregadas = definiciones.map((area) => {
    const delArea = registros.filter((registro) => registro.areaId === area.id);
    const total = (
      campo:
        | "plantillaMeta"
        | "plantillaActiva"
        | "horasProgramadas"
        | "horasTrabajadas"
        | "horasAusentismo"
        | "horasExtra"
        | "ventas"
        | "unidades"
        | "transacciones"
        | "costoNomina",
    ) => {
      const valores = delArea
        .map((registro) => registro[campo])
        .filter((valor): valor is number => typeof valor === "number");
      return valores.length ? valores.reduce((suma, valor) => suma + valor, 0) : null;
    };

    return {
      areaId: area.id,
      plantillaMeta: total("plantillaMeta"),
      plantillaActiva: total("plantillaActiva"),
      horasProgramadas: total("horasProgramadas"),
      horasTrabajadas: total("horasTrabajadas"),
      horasAusentismo: total("horasAusentismo"),
      horasExtra: total("horasExtra"),
      ventas: total("ventas"),
      unidades: total("unidades"),
      transacciones: total("transacciones"),
      costoNomina: total("costoNomina"),
    };
  });

  const ventaDelAlcance = alcanzadas
    .map((tienda) => ventaPorTienda.get(tienda.id))
    .filter((valor): valor is number => typeof valor === "number")
    .reduce((suma: number | null, valor) => (suma ?? 0) + valor, null);

  const resumen = calcularPlantilla(definiciones, agregadas, ventaDelAlcance);

  return { areas: definiciones, tiendas: alcanzadas, porTienda, resumen, registros };
}

/** Índice de eficiencia de cada corte, para ver si la plantilla mejora o se deteriora. */
export async function evolucionPlantilla(limite = 12) {
  const cortes = await prisma.corte.findMany({
    orderBy: { fechaFin: "asc" },
    take: limite,
    select: { id: true, nombre: true },
  });

  const series = [];
  for (const corte of cortes) {
    const { resumen } = await cargarPlantilla(corte.id);
    if (resumen.areasConDatos === 0) continue;
    series.push({
      corteId: corte.id,
      etiqueta: corte.nombre.replace(/^Cierre\s+/i, ""),
      indice: resumen.indice === null ? null : resumen.indice * 100,
      cobertura: resumen.cobertura,
      ausentismo: resumen.ausentismo,
      costoSobreVentas: resumen.costoSobreVentas,
    });
  }
  return series;
}

/** Serie de ventas diarias de la cadena, de la más vieja a la más reciente. */
export async function cargarSerieDiaria(dias = 30) {
  const filas = await prisma.ventaDiaria.findMany({
    orderBy: { fecha: "desc" },
    take: dias,
  });
  return filas
    .map((fila) => ({ fecha: fila.fecha, ventas: fila.ventas }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** Top de productos de un corte, separado por familia y ordenado por unidades. */
export async function cargarProductos(corteId: string) {
  const filas = await prisma.registroProducto.findMany({
    where: { corteId },
    include: { producto: true },
    orderBy: { unidades: "desc" },
  });
  return {
    perecederos: filas.filter((fila) => fila.producto.familia === "PERECEDERO"),
    noPerecederos: filas.filter((fila) => fila.producto.familia === "NO_PERECEDERO"),
  };
}
