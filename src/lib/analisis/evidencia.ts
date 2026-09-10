import { proyectarCierre, type FilaCalculada } from "@/lib/calculos";
import { cargarAjustes, cargarTablero, corteAnterior } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_TIPOLOGIA, TIPOLOGIAS } from "@/lib/dominio";

// Toda la evidencia que recibe el cerebro analítico: cifras ya calculadas, nada crudo.
// Lo que no está aquí, el modelo no lo puede afirmar.

function redondear(valor: number | null, decimales = 2): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function resumir(fila: FilaCalculada) {
  return {
    ventasMeta: redondear(fila.ventasMeta, 0),
    ventasReal: redondear(fila.ventasReal, 0),
    cumplimientoVentas: redondear(fila.cumplimientoVentas, 1),
    brechaVentas: redondear(fila.brechaVentas, 0),
    unidades: redondear(fila.unidadesReal, 0),
    transacciones: redondear(fila.transaccionesReal, 0),
    cumplimientoTransacciones: redondear(fila.cumplimientoTransacciones, 1),
    ticketPromedio: redondear(fila.ticketPromedio),
    upt: redondear(fila.upt),
    margenBrutoPct: redondear(fila.margenBrutoReal, 2),
    margenBrutoUsd: redondear(fila.margenBrutoUsd, 0),
  };
}

export async function construirEvidencia(corteId: string) {
  const corte = await prisma.corte.findUnique({ where: { id: corteId } });
  if (!corte) throw new Error("Corte no encontrado.");

  const [tablero, ajustes, perfil, alertas, notas] = await Promise.all([
    cargarTablero(corteId),
    cargarAjustes(corteId),
    prisma.perfil.findUnique({ where: { id: "maestro" }, include: { zonaPropia: true } }),
    prisma.alerta.findMany({
      where: { corteId, estado: "ABIERTA" },
      include: { tienda: { select: { nombre: true } } },
    }),
    prisma.notaMemoria.findMany({
      where: { vigente: true },
      include: { tienda: { select: { nombre: true } }, zona: { select: { nombre: true } } },
      orderBy: { creadaEn: "desc" },
      take: 40,
    }),
  ]);

  const anterior = await corteAnterior(corte);
  const tableroAnterior = anterior ? await cargarTablero(anterior.id) : null;

  const ajustePorTienda = new Map(
    ajustes.zonas.flatMap((zona) => zona.tiendas.map((fila) => [fila.tiendaId, fila])),
  );

  const tiendas = tablero.zonas.flatMap((zona) =>
    zona.tiendas.map((fila) => {
      const ajuste = ajustePorTienda.get(fila.tiendaId);
      return {
        tienda: fila.tienda,
        zona: zona.zona,
        ...resumir(fila),
        ajustesTotalPct: redondear(ajuste?.totalPorcentaje ?? null, 2),
        ajustePrincipal: ajuste
          ? TIPOLOGIAS.map((tipologia) => ({
              tipologia: ETIQUETA_TIPOLOGIA[tipologia],
              pct: redondear(ajuste.porcentajes[tipologia], 2) ?? 0,
            })).sort((a, b) => b.pct - a.pct)[0]
          : null,
      };
    }),
  );

  const ventasAnteriorPorTienda = new Map(
    (tableroAnterior?.zonas ?? []).flatMap((zona) =>
      zona.tiendas.map((fila) => [fila.tienda, fila.ventasReal]),
    ),
  );

  return {
    corte: {
      nombre: corte.nombre,
      tipo: corte.tipo,
      desde: corte.fechaInicio.toISOString().slice(0, 10),
      hasta: corte.fechaFin.toISOString().slice(0, 10),
      diasDelMes: corte.diasDelMes,
      diasTranscurridos: corte.diasTranscurridos,
    },
    cadena: {
      ...resumir(tablero.total),
      proyeccionCierre: redondear(
        proyectarCierre(tablero.total.ventasReal, corte.diasTranscurridos, corte.diasDelMes),
        0,
      ),
      tiendasBajoMeta: tiendas.filter(
        (tienda) => (tienda.cumplimientoVentas ?? 100) < 100,
      ).length,
      totalTiendas: tiendas.length,
    },
    zonas: tablero.zonas.map((zona) => ({
      zona: zona.zona,
      gerente: zona.gerente,
      ...resumir(zona.subtotal),
      ajustesTotalPct: redondear(
        ajustes.zonas.find((bloque) => bloque.zonaId === zona.zonaId)?.subtotal.totalPorcentaje ??
          null,
        2,
      ),
    })),
    tiendas,
    ajustesCadena: {
      totalUsd: redondear(ajustes.total.totalMonto, 0),
      totalPct: redondear(ajustes.total.totalPorcentaje, 2),
      porTipologia: TIPOLOGIAS.map((tipologia) => ({
        tipologia: ETIQUETA_TIPOLOGIA[tipologia],
        usd: redondear(ajustes.total.montos[tipologia], 0),
        pctSobreVentas: redondear(ajustes.total.porcentajes[tipologia], 2),
      })),
    },
    comparativo: tableroAnterior
      ? {
          corteAnterior: anterior?.nombre,
          ventasAnteriores: redondear(tableroAnterior.total.ventasReal, 0),
          variacionVentasPct: redondear(
            tableroAnterior.total.ventasReal && tablero.total.ventasReal
              ? ((tablero.total.ventasReal - tableroAnterior.total.ventasReal) /
                  tableroAnterior.total.ventasReal) *
                  100
              : null,
            1,
          ),
          porTienda: tiendas
            .map((tienda) => {
              const previo = ventasAnteriorPorTienda.get(tienda.tienda);
              if (!previo || !tienda.ventasReal) return null;
              return {
                tienda: tienda.tienda,
                variacionPct: redondear(((tienda.ventasReal - previo) / previo) * 100, 1),
              };
            })
            .filter(Boolean),
        }
      : null,
    alertasAbiertas: alertas.map((alerta) => ({
      tipo: alerta.tipo,
      tienda: alerta.tienda?.nombre ?? null,
      indicador: alerta.indicador,
      mensaje: alerta.mensaje,
    })),
    contextoDelUsuario: {
      nombre: perfil?.nombre,
      cargo: perfil?.cargo,
      zonaPropia: perfil?.zonaPropia?.nombre ?? null,
      contexto: perfil?.contexto,
      instrucciones: perfil?.instruccionesCerebro,
    },
    memoriaOperativa: notas.map((nota) => ({
      texto: nota.texto,
      tienda: nota.tienda?.nombre ?? null,
      zona: nota.zona?.nombre ?? null,
      etiqueta: nota.etiqueta,
    })),
  };
}

export type Evidencia = Awaited<ReturnType<typeof construirEvidencia>>;
