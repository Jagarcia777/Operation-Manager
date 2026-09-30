import type { PrismaClient } from "@/generated/prisma/client";
import { metaDeclarada } from "@/lib/carga";
import type { AlertaDetectada } from "@/lib/validacion";
import { conciliarIndicadores, type Conciliacion } from "./conciliar";
import { emparejarTienda, indiceDeCategorias, normalizar } from "./emparejar";
import type { ExtraccionResumenEjecutivoTipo } from "./esquemas";

// Guarda el Resumen Ejecutivo de la cadena. Un solo archivo alimenta dos cortes —el día y el
// acumulado del mes—, la mezcla por categoría, el top de productos y la serie diaria, porque
// eso es lo que el informe trae y separarlo obligaría a subirlo cinco veces.

type Cliente = Pick<
  PrismaClient,
  | "corte"
  | "tienda"
  | "categoria"
  | "producto"
  | "registroVentas"
  | "registroCategoria"
  | "registroProducto"
  | "ventaDiaria"
>;

export type ResultadoResumen = {
  corteDiaId: string;
  corteMesId: string;
  sucursalesGuardadas: number;
  sucursalesSinEmparejar: string[];
  categoriasGuardadas: number;
  categoriasSinEmparejar: string[];
  productosGuardados: number;
  diasGuardados: number;
  alertas: AlertaDetectada[];
};

function dividir(numerador: number | null, denominador: number | null): number | null {
  if (numerador === null || denominador === null || denominador === 0) return null;
  return numerador / denominador;
}

function fechaDelInforme(texto: string | null): Date {
  const fecha = texto ? new Date(`${texto}T00:00:00Z`) : new Date();
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
}

const dosDigitos = (valor: number) => String(valor).padStart(2, "0");

export function etiquetaFecha(fecha: Date) {
  return `${dosDigitos(fecha.getUTCDate())}/${dosDigitos(fecha.getUTCMonth() + 1)}/${fecha.getUTCFullYear()}`;
}

/**
 * Los dos cortes que sostiene el informe. El diario lleva un día transcurrido y el acumulado
 * los que van del mes: esa cuenta es la que permite comparar un corte contra otro por venta
 * diaria en vez de por acumulado, que es lo que hacía parecer caídas del 90 % donde no las hay.
 */
async function prepararCortes(prisma: Cliente, fecha: Date) {
  const inicioMes = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
  const diasDelMes = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diasTranscurridos = fecha.getUTCDate();

  const dia = await prisma.corte.upsert({
    where: { nombre: etiquetaFecha(fecha) },
    update: { fechaInicio: fecha, fechaFin: fecha, diasDelMes, diasTranscurridos: 1 },
    create: {
      nombre: etiquetaFecha(fecha),
      tipo: "DIARIO",
      fechaInicio: fecha,
      fechaFin: fecha,
      diasDelMes,
      diasTranscurridos: 1,
      estado: "REVISION",
    },
  });

  const mes = await prisma.corte.upsert({
    where: { nombre: `Acumulado al ${etiquetaFecha(fecha)}` },
    update: { fechaInicio: inicioMes, fechaFin: fecha, diasDelMes, diasTranscurridos },
    create: {
      nombre: `Acumulado al ${etiquetaFecha(fecha)}`,
      tipo: "ACUMULADO_MES",
      fechaInicio: inicioMes,
      fechaFin: fecha,
      diasDelMes,
      diasTranscurridos,
      estado: "REVISION",
    },
  });

  return { dia, mes };
}

export async function guardarResumenEjecutivo(
  prisma: Cliente,
  lectura: ExtraccionResumenEjecutivoTipo,
): Promise<ResultadoResumen> {
  const fecha = fechaDelInforme(lectura.fecha);
  const { dia, mes } = await prepararCortes(prisma, fecha);

  const catalogo = await prisma.tienda.findMany({
    select: { id: true, nombre: true, codigo: true, alias: true },
  });

  const sinEmparejar: string[] = [];
  const conciliacionTicket: Conciliacion["valores"] = [];
  const conciliacionPrecio: Conciliacion["valores"] = [];
  const conciliacionUnidades: Conciliacion["valores"] = [];

  let guardadas = 0;

  for (const fila of lectura.sucursales) {
    const emparejada = emparejarTienda(fila.sucursal, catalogo);
    if (!emparejada.tiendaId) {
      sinEmparejar.push(fila.sucursal);
      continue;
    }
    const tiendaId = emparejada.tiendaId;
    const tienda = emparejada.tiendaNombre ?? fila.sucursal;

    await prisma.registroVentas.upsert({
      where: { corteId_tiendaId: { corteId: dia.id, tiendaId } },
      update: {
        ventasReal: fila.diaVentas,
        unidadesReal: fila.diaUnidades,
        transaccionesReal: fila.diaTransacciones,
        margenBrutoReal: fila.diaMargenBruto,
        origen: "IA",
      },
      create: {
        corteId: dia.id,
        tiendaId,
        ventasReal: fila.diaVentas,
        unidadesReal: fila.diaUnidades,
        transaccionesReal: fila.diaTransacciones,
        margenBrutoReal: fila.diaMargenBruto,
        origen: "IA",
      },
    });

    const valoresMes = {
      ventasReal: fila.mesVentas,
      // El informe llega con la columna de metas en cero: eso es una meta no cargada, no una
      // meta de cero. Guardarla como cero convertiría cada sucursal en un -100 % de variación.
      ventasMeta: metaDeclarada(fila.mesMeta),
      unidadesReal: fila.mesUnidades,
      transaccionesReal: fila.mesTransacciones,
      ticketPromedioInforme: fila.ticketPromedio,
      precioPromedioInforme: fila.precioPromedio,
      unidadesPorTicketInforme: fila.unidadesPorTicket,
      origen: "IA",
    };

    await prisma.registroVentas.upsert({
      where: { corteId_tiendaId: { corteId: mes.id, tiendaId } },
      update: valoresMes,
      create: { corteId: mes.id, tiendaId, ...valoresMes },
    });

    guardadas += 1;

    conciliacionTicket.push({
      tiendaId,
      tienda,
      impreso: fila.ticketPromedio,
      derivado: dividir(fila.mesVentas, fila.mesTransacciones),
    });
    conciliacionPrecio.push({
      tiendaId,
      tienda,
      impreso: fila.precioPromedio,
      derivado: dividir(fila.mesVentas, fila.mesUnidades),
    });
    conciliacionUnidades.push({
      tiendaId,
      tienda,
      impreso: fila.unidadesPorTicket,
      derivado: dividir(fila.mesUnidades, fila.mesTransacciones),
    });
  }

  // ── Categorías de la cadena ────────────────────────────────────────────────
  // Van sin tienda porque el informe publica la mezcla consolidada. Se reemplaza el juego
  // completo en cada carga: sin índice único que las proteja (en Postgres dos NULL no chocan),
  // borrar y volver a escribir es lo único que garantiza que no se dupliquen.
  const porNombre = indiceDeCategorias(await prisma.categoria.findMany());

  await prisma.registroCategoria.deleteMany({ where: { corteId: dia.id, tiendaId: null } });

  const categoriasSinEmparejar: string[] = [];
  let categoriasGuardadas = 0;
  for (const fila of lectura.categorias) {
    const categoria = porNombre.get(normalizar(fila.categoria));
    if (!categoria) {
      categoriasSinEmparejar.push(fila.categoria);
      continue;
    }
    await prisma.registroCategoria.create({
      data: {
        corteId: dia.id,
        tiendaId: null,
        categoriaId: categoria.id,
        ventasReal: fila.ventas,
        unidadesReal: fila.unidades,
        margenBrutoReal: fila.margenBruto,
        origen: "IA",
      },
    });
    categoriasGuardadas += 1;
  }

  // ── Top de productos ───────────────────────────────────────────────────────
  let productosGuardados = 0;
  for (const [indice, fila] of lectura.productos.entries()) {
    const producto = await prisma.producto.upsert({
      where: { nombre: fila.producto },
      update: { familia: fila.familia },
      create: { nombre: fila.producto, familia: fila.familia },
    });
    await prisma.registroProducto.upsert({
      where: { corteId_productoId: { corteId: dia.id, productoId: producto.id } },
      update: { unidades: fila.unidades, posicion: indice + 1 },
      create: {
        corteId: dia.id,
        productoId: producto.id,
        unidades: fila.unidades,
        posicion: indice + 1,
      },
    });
    productosGuardados += 1;
  }

  // ── Serie diaria de la cadena ──────────────────────────────────────────────
  let diasGuardados = 0;
  for (const punto of lectura.serieDiaria) {
    if (punto.ventas === null) continue;
    const fechaPunto = new Date(`${punto.fecha}T00:00:00Z`);
    if (Number.isNaN(fechaPunto.getTime())) continue;
    await prisma.ventaDiaria.upsert({
      where: { fecha: fechaPunto },
      update: { ventas: punto.ventas },
      create: { fecha: fechaPunto, ventas: punto.ventas },
    });
    diasGuardados += 1;
  }

  const alertas = [
    ...conciliarIndicadores([
      {
        clave: "ticketPromedio",
        etiqueta: "Ticket promedio",
        formula: "ventas ÷ transacciones",
        valores: conciliacionTicket,
      },
      {
        clave: "precioPromedio",
        etiqueta: "Precio promedio por unidad",
        formula: "ventas ÷ unidades",
        valores: conciliacionPrecio,
      },
      {
        clave: "unidadesPorTicket",
        etiqueta: "Unidades por ticket",
        formula: "unidades ÷ transacciones",
        valores: conciliacionUnidades,
      },
    ]),
    ...revisarTotalesImpresos(lectura),
  ];

  return {
    corteDiaId: dia.id,
    corteMesId: mes.id,
    sucursalesGuardadas: guardadas,
    sucursalesSinEmparejar: sinEmparejar,
    categoriasGuardadas,
    categoriasSinEmparejar,
    productosGuardados,
    diasGuardados,
    alertas,
  };
}

/** Diferencia que ya no se explica por redondeo del informe. */
const TOLERANCIA_TOTAL_PCT = 0.5;

function compararTotal(
  etiqueta: string,
  impreso: number | null | undefined,
  sumado: number | null,
): AlertaDetectada | null {
  if (impreso === null || impreso === undefined || sumado === null || impreso === 0) return null;
  const desvio = ((sumado - impreso) / impreso) * 100;
  if (Math.abs(desvio) <= TOLERANCIA_TOTAL_PCT) return null;
  return {
    tipo: "SUBTOTAL_DESCUADRADO",
    severidad: "ALTA",
    tiendaId: null,
    indicador: etiqueta,
    valorObservado: Math.round(sumado),
    valorEsperado: Math.round(impreso),
    mensaje: `${etiqueta}: la suma de las filas da ${Math.round(sumado).toLocaleString("es-VE")} y el informe imprime ${Math.round(impreso).toLocaleString("es-VE")}. Falta o sobra una fila en la lectura del documento.`,
  };
}

function sumar(valores: (number | null)[]): number | null {
  const validos = valores.filter((valor): valor is number => typeof valor === "number");
  return validos.length ? validos.reduce((total, valor) => total + valor, 0) : null;
}

/**
 * Contrasta lo leído contra los totales que el propio informe imprime. Es la comprobación que
 * detecta una fila saltada o leída dos veces, que es el modo en que falla una lectura de tabla
 * larga y el que más caro sale: un total mal por una sucursal de menos parece una caída real.
 */
export function revisarTotalesImpresos(
  lectura: ExtraccionResumenEjecutivoTipo,
): AlertaDetectada[] {
  const alertas: AlertaDetectada[] = [];

  const sumaDia = sumar(lectura.sucursales.map((fila) => fila.diaVentas));
  const sumaMes = sumar(lectura.sucursales.map((fila) => fila.mesVentas));
  const sumaCategorias = sumar(lectura.categorias.map((fila) => fila.ventas));

  const candidatas = [
    compararTotal("Venta del día por sucursal", lectura.totalImpreso?.diaVentas, sumaDia),
    compararTotal("Venta del mes por sucursal", lectura.totalImpreso?.mesVentas, sumaMes),
    compararTotal("Venta del día por categoría", lectura.kpiDia?.ventas, sumaCategorias),
  ];

  for (const alerta of candidatas) if (alerta) alertas.push(alerta);
  return alertas;
}
