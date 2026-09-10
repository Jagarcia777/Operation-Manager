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
  const [tiendas, registros] = await Promise.all([
    cargarTiendas(),
    prisma.registroVentas.findMany({ where: { corteId } }),
  ]);
  return construirTablero(tiendas, registros);
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
