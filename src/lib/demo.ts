import { AREAS_OPERATIVAS } from "@/lib/areas";
import { TIPOLOGIAS } from "@/lib/dominio";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Cadena de demostración. Nada de esto es real: sirve para recorrer la aplicación llena, con
 * un año de historia y con tiendas que se comportan distinto entre sí, que es lo que hace
 * interesante el análisis. Las cifras están calibradas contra un supermercado de tamaño medio.
 */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Estacionalidad del consumo de alimentos: diciembre manda, enero es el castigo. */
const ESTACIONALIDAD = [0.86, 0.90, 0.98, 1.00, 1.05, 1.02, 1.06, 1.00, 0.99, 1.02, 1.08, 1.35];

const ZONA_PROPIA = {
  nombre: "Zona Metropolitana",
  gerente: "José García",
  orden: 1,
  detallada: true,
};

const ZONAS_COMPARACION = [
  { nombre: "Zona Norte", gerente: "Marisol Peña", orden: 2, detallada: false, tiendas: 5, base: 1_480_000 },
  { nombre: "Zona Centro", gerente: "Aníbal Cortés", orden: 3, detallada: false, tiendas: 6, base: 1_620_000 },
  { nombre: "Zona Andina", gerente: "Rebeca Duarte", orden: 4, detallada: false, tiendas: 4, base: 1_350_000 },
  { nombre: "Zona Llanos", gerente: "Tomás Alcántara", orden: 5, detallada: false, tiendas: 3, base: 1_180_000 },
  { nombre: "Zona Sur", gerente: "Carolina Vieira", orden: 6, detallada: false, tiendas: 5, base: 1_540_000 },
];

/**
 * Cada tienda con un carácter propio, para que el análisis tenga algo que decir:
 * una insignia fuerte, una de mucho tráfico y ticket bajo, una estacional de costa,
 * una con problema de margen, una recién abierta que todavía rampa, y una pequeña impecable.
 */
const TIENDAS = [
  {
    nombre: "Vega Altamira", codigo: "ALT", ciudad: "San Bernardo", formato: "Hipermercado",
    metrosCuadrados: 3200, aperturaHaceMeses: 96,
    base: 2_950_000, rpt: 36.5, upt: 3.1, margen: 22.8, logro: 1.04,
    merma: 0.82, dañada: 0.05, carga: 0.19, inventario: 0.14,
    alias: "Altamira\nSUC. ALTAMIRA",
  },
  {
    nombre: "Vega Los Robles", codigo: "ROB", ciudad: "San Bernardo", formato: "Supermercado",
    metrosCuadrados: 1850, aperturaHaceMeses: 72,
    base: 2_180_000, rpt: 24.2, upt: 2.4, margen: 20.1, logro: 1.01,
    merma: 0.96, dañada: 0.07, carga: 0.24, inventario: 0.18,
    alias: "Los Robles\nSUC. ROBLES",
  },
  {
    nombre: "Vega Costa Verde", codigo: "CVE", ciudad: "Puerto Lindo", formato: "Supermercado",
    metrosCuadrados: 2100, aperturaHaceMeses: 54,
    base: 1_920_000, rpt: 31.8, upt: 2.8, margen: 21.4, logro: 0.98,
    merma: 0.91, dañada: 0.06, carga: 0.26, inventario: 0.20,
    estacional: true,
    alias: "Costa Verde\nCOSTAVERDE",
  },
  {
    nombre: "Vega San Marcos", codigo: "SMA", ciudad: "San Marcos", formato: "Supermercado",
    metrosCuadrados: 1620, aperturaHaceMeses: 63,
    base: 1_640_000, rpt: 22.6, upt: 2.2, margen: 16.9, logro: 0.93,
    merma: 1.12, dañada: 0.09, carga: 0.34, inventario: 0.31,
    alias: "San Marcos\nSUC. SAN MARCOS",
  },
  {
    nombre: "Vega Puerto Nuevo", codigo: "PNU", ciudad: "Puerto Lindo", formato: "Supermercado",
    metrosCuadrados: 1740, aperturaHaceMeses: 5,
    base: 1_120_000, rpt: 26.9, upt: 2.5, margen: 19.2, logro: 0.96,
    merma: 1.04, dañada: 0.08, carga: 0.29, inventario: 0.24,
    rampa: true,
    alias: "Puerto Nuevo\nPTO NUEVO",
  },
  {
    nombre: "Vega Mirador", codigo: "MIR", ciudad: "El Mirador", formato: "Exprés",
    metrosCuadrados: 980, aperturaHaceMeses: 41,
    base: 1_310_000, rpt: 29.4, upt: 2.6, margen: 23.6, logro: 1.06,
    merma: 0.71, dañada: 0.04, carga: 0.16, inventario: 0.11,
    alias: "Mirador\nSUC. MIRADOR",
  },
];

/** Mezcla de categorías de un supermercado de alimentos, con su peso y su margen típico. */
const CATEGORIAS = [
  { nombre: "Víveres", peso: 0.208, margen: 17.4 },
  { nombre: "Carnicería", peso: 0.152, margen: 12.8 },
  { nombre: "Frutas y Verduras", peso: 0.104, margen: 26.5 },
  { nombre: "Lácteos", peso: 0.098, margen: 18.2 },
  { nombre: "Bebidas", peso: 0.092, margen: 21.7 },
  { nombre: "Charcutería", peso: 0.078, margen: 24.1 },
  { nombre: "Panadería", peso: 0.064, margen: 38.6 },
  { nombre: "Limpieza", peso: 0.058, margen: 22.9 },
  { nombre: "Congelados", peso: 0.046, margen: 23.4 },
  { nombre: "Cuidado Personal", peso: 0.041, margen: 27.8 },
  { nombre: "Licores", peso: 0.032, margen: 19.6 },
  { nombre: "Bazar", peso: 0.017, margen: 31.2 },
  { nombre: "Mascotas", peso: 0.010, margen: 25.3 },
];

/** Ruido reproducible: el demo tiene que verse igual cada vez que se carga. */
function ruido(semilla: number) {
  const x = Math.sin(semilla * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Variación centrada en 1 con la amplitud pedida. */
function variar(semilla: number, amplitud: number) {
  return 1 + (ruido(semilla) - 0.5) * 2 * amplitud;
}

const redondear = (valor: number, paso = 100) => Math.round(valor / paso) * paso;

export type ResumenDemo = {
  cortes: number;
  tiendas: number;
  registros: number;
  meses: string;
};

export async function generarDemo(prisma: PrismaClient): Promise<ResumenDemo> {
  await vaciarDatos(prisma);

  // ── Catálogo ────────────────────────────────────────────────────────────────
  const zonaPropia = await prisma.zona.create({ data: ZONA_PROPIA });

  // createManyAndReturn en vez de un create por fila: cada ida a la base cuesta decenas de
  // milisegundos desde una función serverless, y aquí se hacían cuarenta seguidas.
  const creadas = await prisma.zona.createManyAndReturn({
    // `tiendas` y `base` describen la zona para generar sus cifras, pero no son columnas.
    data: ZONAS_COMPARACION.map((zona) => ({
      nombre: zona.nombre,
      gerente: zona.gerente,
      orden: zona.orden,
      detallada: zona.detallada,
    })),
  });
  const zonasComparacion = creadas.map((zona) => {
    const definicion = ZONAS_COMPARACION.find((z) => z.nombre === zona.nombre)!;
    return { ...zona, tiendasDeclaradas: definicion.tiendas, base: definicion.base };
  });

  const hoy = new Date();
  const filasTienda = await prisma.tienda.createManyAndReturn({
    data: TIENDAS.map((tienda, indice) => {
      const apertura = new Date(hoy);
      apertura.setMonth(apertura.getMonth() - tienda.aperturaHaceMeses);
      return {
        nombre: tienda.nombre,
        codigo: tienda.codigo,
        alias: tienda.alias,
        ciudad: tienda.ciudad,
        formato: tienda.formato,
        metrosCuadrados: tienda.metrosCuadrados,
        fechaApertura: apertura,
        zonaId: zonaPropia.id,
        orden: indice + 1,
      };
    }),
  });
  const tiendas = TIENDAS.map((perfil) => ({
    perfil,
    fila: filasTienda.find((fila) => fila.nombre === perfil.nombre)!,
  }));

  const filasCategoria = await prisma.categoria.createManyAndReturn({
    data: CATEGORIAS.map((categoria, indice) => ({
      nombre: categoria.nombre,
      orden: indice + 1,
    })),
  });
  const categorias = CATEGORIAS.map((perfil) => ({
    perfil,
    fila: filasCategoria.find((fila) => fila.nombre === perfil.nombre)!,
  }));

  // ── Doce cierres de mes, del más viejo al más reciente ──────────────────────
  const cortes = await prisma.corte.createManyAndReturn({
    data: Array.from({ length: 12 }, (_, indice) => {
      const atras = 12 - indice;
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() - atras + 1, 0);
      const diasDelMes = fin.getDate();
      return {
        nombre: `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`,
        tipo: "CIERRE_MES",
        fechaInicio: inicio,
        fechaFin: fin,
        estado: "CERRADO",
        diasDelMes,
        diasTranscurridos: diasDelMes,
      };
    }),
  });

  // Y el mes en curso, abierto, con dos cortes acumulados: es el que se trabaja.
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const diaHoy = Math.max(hoy.getDate(), 14);
  const corteMedio = await prisma.corte.create({
    data: {
      nombre: `Acumulado al ${String(Math.floor(diaHoy / 2)).padStart(2, "0")}/${String(inicioMes.getMonth() + 1).padStart(2, "0")}`,
      tipo: "SEMANAL",
      fechaInicio: inicioMes,
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), Math.floor(diaHoy / 2)),
      estado: "CERRADO",
      diasDelMes: finMes.getDate(),
      diasTranscurridos: Math.floor(diaHoy / 2),
    },
  });
  const corteActual = await prisma.corte.create({
    data: {
      nombre: `Acumulado al ${String(diaHoy).padStart(2, "0")}/${String(inicioMes.getMonth() + 1).padStart(2, "0")}`,
      tipo: "SEMANAL",
      fechaInicio: inicioMes,
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), diaHoy),
      estado: "REVISION",
      diasDelMes: finMes.getDate(),
      diasTranscurridos: diaHoy,
    },
  });

  const todos = [
    ...cortes.map((corte, i) => ({ corte, mesIndice: i, fraccion: 1 })),
    { corte: corteMedio, mesIndice: 12, fraccion: Math.floor(diaHoy / 2) / finMes.getDate() },
    { corte: corteActual, mesIndice: 12, fraccion: diaHoy / finMes.getDate() },
  ];

  const ventas = [];
  const ajustes = [];
  const registrosCategoria = [];
  const registrosZona = [];

  for (const { corte, mesIndice, fraccion } of todos) {
    const mesCalendario = corte.fechaInicio.getMonth();
    const estacion = ESTACIONALIDAD[mesCalendario];
    // La cadena crece ~0,6 % al mes; el índice 0 es el mes más viejo.
    const crecimiento = 1 + mesIndice * 0.006;

    for (const [indiceTienda, { perfil, fila }] of tiendas.entries()) {
      const semilla = mesIndice * 17 + indiceTienda * 3 + 1;

      // Una tienda recién abierta no vende como una madura: rampa hasta el mes seis.
      const mesesAbierta = perfil.aperturaHaceMeses - (12 - mesIndice);
      if (mesesAbierta < 0) continue;
      const rampa = perfil.rampa ? Math.min(1, 0.42 + mesesAbierta * 0.11) : 1;

      // La de costa vive del verano y de diciembre; el resto sigue la estacionalidad normal.
      const estacionTienda = perfil.estacional
        ? estacion * (mesCalendario === 11 || mesCalendario === 6 || mesCalendario === 7 ? 1.18 : 0.95)
        : estacion;

      const mensual = perfil.base * estacionTienda * crecimiento * rampa;
      const ventasMeta = redondear(mensual * fraccion * variar(semilla + 101, 0.015));
      const logro = perfil.logro * variar(semilla + 202, 0.055);
      const ventasReal = redondear(ventasMeta * logro);

      const rpt = perfil.rpt * variar(semilla + 303, 0.04);
      const transaccionesReal = Math.round(ventasReal / rpt);
      const upt = perfil.upt * variar(semilla + 404, 0.035);
      const unidadesReal = Math.round(transaccionesReal * upt);
      const margenReal = Number((perfil.margen * variar(semilla + 505, 0.045)).toFixed(2));

      ventas.push({
        corteId: corte.id,
        tiendaId: fila.id,
        ventasMeta,
        ventasReal,
        transaccionesMeta: Math.round(transaccionesReal / logro),
        transaccionesReal,
        unidadesMeta: Math.round((transaccionesReal / logro) * perfil.upt),
        unidadesReal,
        margenBrutoMeta: Number((perfil.margen + 0.8).toFixed(2)),
        margenBrutoReal: margenReal,
        origen: "MANUAL",
      });

      // Ajustes: van en negativo por ser en contra, salvo Ventas, que puede salir a favor.
      const pesos: Record<string, number> = {
        MERMA: -perfil.merma,
        MERCANCIA_DANADA: -perfil.dañada,
        CARGA_DESCARGA: -perfil.carga,
        INVENTARIO: -perfil.inventario,
        VENTAS: 0,
      };
      // Solo las tipologías del reporte clásico: las que llegan por el libro de ajustes
      // (donación, mercadeo, hurto) no tienen perfil en el demo, y sin peso darían NaN.
      for (const [indiceTipo, tipologia] of TIPOLOGIAS.filter((tipo) => tipo in pesos).entries()) {
        const base = pesos[tipologia];
        const porcentaje =
          tipologia === "VENTAS"
            ? Number(((ruido(semilla + 700 + indiceTipo) - 0.45) * 0.05).toFixed(4))
            : Number((base * variar(semilla + 800 + indiceTipo, 0.22)).toFixed(4));
        ajustes.push({
          corteId: corte.id,
          tiendaId: fila.id,
          tipologia,
          monto: Math.round((ventasReal * porcentaje) / 100),
          porcentaje,
          origen: "MANUAL",
        });
      }

      // El detalle por categoría solo en los últimos seis cortes: más atrás nadie lo consulta
      // y multiplicar 13 categorías por 6 tiendas por 14 cortes solo engorda la base.
      if (mesIndice >= 8) {
        for (const [indiceCat, categoria] of categorias.entries()) {
          const ventaCategoria = redondear(
            ventasReal * categoria.perfil.peso * variar(semilla + 900 + indiceCat, 0.12),
            10,
          );
          registrosCategoria.push({
            corteId: corte.id,
            tiendaId: fila.id,
            categoriaId: categoria.fila.id,
            ventasReal: ventaCategoria,
            unidadesReal: Math.round(ventaCategoria / (4 + ruido(semilla + indiceCat) * 9)),
            margenBrutoReal: Number(
              (categoria.perfil.margen * variar(semilla + 950 + indiceCat, 0.13)).toFixed(2),
            ),
            origen: "MANUAL",
          });
        }
      }
    }

    for (const [indiceZona, zona] of zonasComparacion.entries()) {
      const semilla = mesIndice * 23 + indiceZona * 7 + 5;
      const mensual = zona.base * zona.tiendasDeclaradas * estacion * crecimiento;
      const ventasMeta = redondear(mensual * fraccion * variar(semilla + 11, 0.02));
      const logro = 0.99 * variar(semilla + 22, 0.05);
      const ventasReal = redondear(ventasMeta * logro);
      const rpt = 27 + ruido(semilla + 33) * 9;
      const transaccionesReal = Math.round(ventasReal / rpt);

      registrosZona.push({
        corteId: corte.id,
        zonaId: zona.id,
        ventasMeta,
        ventasReal,
        transaccionesMeta: Math.round(transaccionesReal / logro),
        transaccionesReal,
        unidadesMeta: Math.round(transaccionesReal * 2.55),
        unidadesReal: Math.round(transaccionesReal * (2.3 + ruido(semilla + 44) * 0.5)),
        margenBrutoMeta: 21.5,
        margenBrutoReal: Number((19.4 + ruido(semilla + 55) * 3.4).toFixed(2)),
        origen: "MANUAL",
      });
    }
  }

  await prisma.registroVentas.createMany({ data: ventas });
  await prisma.registroAjuste.createMany({ data: ajustes });
  await prisma.registroZona.createMany({ data: registrosZona });
  for (let i = 0; i < registrosCategoria.length; i += 500) {
    await prisma.registroCategoria.createMany({ data: registrosCategoria.slice(i, i + 500) });
  }

  await sembrarUmbrales(prisma);
  await sembrarBenchmarks(prisma);
  await sembrarPerfil(prisma, zonaPropia.id);
  await sembrarPlanes(prisma, zonaPropia.id, tiendas, corteActual.id);
  await sembrarNotas(prisma, zonaPropia.id, tiendas);
  await sembrarPlantilla(prisma, ventas, tiendas);
  await sembrarAlertas(prisma, corteActual.id, corteMedio.id, tiendas);
  await sembrarAnalisis(prisma, corteActual, zonaPropia.id);
  await sembrarChecklists(prisma, tiendas, corteActual.id);
  await sembrarVentaDiaria(
    prisma,
    corteActual.fechaFin,
    // Toda la cadena: el detalle de la zona propia y el agregado de las demás.
    [...ventas, ...registrosZona]
      .filter((registro) => registro.corteId === corteActual.id)
      .reduce((total, registro) => total + (registro.ventasReal ?? 0), 0) / diaHoy,
  );

  return {
    cortes: todos.length,
    tiendas: tiendas.length,
    registros: ventas.length + ajustes.length + registrosZona.length + registrosCategoria.length,
    meses: `${cortes[0].nombre} — ${corteActual.nombre}`,
  };
}

/**
 * Vacía el contenido sin tocar la estructura. Se hace por barrido del esquema y no con una
 * lista de modelos a propósito: la lista se olvida. Ya pasó —los checklists se añadieron al
 * modelo y no a esta función, y la segunda carga del demo reventaba contra el nombre único—,
 * y el próximo modelo que se agregue volvería a olvidarse.
 *
 * TRUNCATE ... CASCADE en una sola ida a la base, en vez de quince deleteMany encadenados por
 * orden de dependencia: más rápido y sin orden que mantener.
 */
// ─── Venta diaria ───────────────────────────────────────────────────────────

/**
 * Peso de cada día en un supermercado venezolano, de domingo a sábado: el fin de semana carga
 * la compra grande y el martes es el día más flojo. Es lo que el perfil semanal tiene que
 * descubrir solo a partir de la serie.
 */
const FACTOR_DIA = [1.06, 0.88, 0.84, 0.9, 0.93, 1.09, 1.3];

/**
 * Ocho semanas de venta diaria de la cadena, que terminan el día del corte actual y promedian
 * lo mismo que su acumulado. Lleva el golpe de quincena y ruido de ±5 % para que el último día
 * de cada semana no calce exacto con su promedio.
 */
async function sembrarVentaDiaria(prisma: PrismaClient, fin: Date, promedioDiario: number) {
  const mediaFactores = FACTOR_DIA.reduce((total, factor) => total + factor, 0) / 7;
  const ultimo = Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate());

  const data = Array.from({ length: 56 }, (_, atras) => {
    const fecha = new Date(ultimo - atras * 86_400_000);
    const quincena = [15, 16, 30, 31, 1].includes(fecha.getUTCDate()) ? 1.07 : 1;
    const ventas =
      (promedioDiario * FACTOR_DIA[fecha.getUTCDay()] * quincena * variar(9_000 + atras, 0.05)) /
      mediaFactores;
    return { fecha, ventas: redondear(ventas), origen: "MANUAL" };
  });

  await prisma.ventaDiaria.createMany({ data });
}

// ─── Eficiencia de la plantilla ─────────────────────────────────────────────

/**
 * Cuánto le toca a cada área del volumen de la tienda. No es una invención libre: la venta
 * de perecederos sigue el peso de sus categorías, las unidades de reposición salen de las
 * unidades vendidas y las transacciones de cajas son todas las de la tienda. Así el módulo
 * de eficiencia y el tablero cuentan la misma historia y no dos distintas.
 */
const REPARTO_AREAS: Record<string, { base: "VENTAS" | "UNIDADES" | "TRANSACCIONES"; parte: number }> = {
  "Cajas (Front End)": { base: "TRANSACCIONES", parte: 1 },
  "Piso de Venta — Abarrotes / Secos": { base: "UNIDADES", parte: 0.85 },
  // Solo una parte de la venta de la categoría pasa por el mostrador atendido: el resto sale
  // preempacado del anaquel y lo repone el piso de venta. Por eso la parte es menor que el
  // peso de la categoría en el tablero.
  "Perecederos — Carnicería": { base: "VENTAS", parte: 0.09 },
  "Perecederos — Charcutería": { base: "VENTAS", parte: 0.05 },
  "Panadería y Pastelería": { base: "VENTAS", parte: 0.035 },
  "Frutas y Hortalizas": { base: "VENTAS", parte: 0.065 },
  "Lácteos y Refrigerados": { base: "UNIDADES", parte: 0.42 },
  Congelados: { base: "UNIDADES", parte: 0.2 },
  // Recepción se mide en bultos, no en unidades sueltas: alrededor de doce por bulto.
  "Recepción y Almacén": { base: "UNIDADES", parte: 0.14 },
  "Reposición General / Abastecimiento": { base: "UNIDADES", parte: 0.55 },
  "Atención al Cliente / Servicio": { base: "TRANSACCIONES", parte: 0.08 },
};

/**
 * Dónde duele en cada tienda. Un problema de productividad real se concentra en dos o tres
 * áreas con nombre y apellido; no se reparte parejo por toda la nómina. Sin esto el demo
 * enseñaría seis tiendas mediocres y ninguna con un foco claro donde actuar.
 */
const FOCOS_DEBILES: Record<string, { areas: string[]; factor: number }> = {
  SMA: { areas: ["Perecederos — Carnicería", "Reposición General / Abastecimiento"], factor: 0.66 },
  PNU: { areas: ["Cajas (Front End)", "Recepción y Almacén"], factor: 0.7 },
  CVE: { areas: ["Panadería y Pastelería"], factor: 0.74 },
};

/**
 * Carácter laboral de cada tienda, alineado con el comercial: la insignia y la exprés
 * rinden por encima del estándar, la del problema de margen viene corta de productividad y
 * la recién abierta todavía está aprendiendo. `costoObjetivo` es el porcentaje de la venta
 * que se lleva la nómina, y de ahí sale el costo por hora.
 */
const CARACTER_LABORAL: Record<string, { eficiencia: number; cobertura: number; ausentismo: number; costoObjetivo: number }> = {
  ALT: { eficiencia: 1.04, cobertura: 0.97, ausentismo: 0.035, costoObjetivo: 7.2 },
  ROB: { eficiencia: 0.98, cobertura: 0.95, ausentismo: 0.042, costoObjetivo: 7.9 },
  CVE: { eficiencia: 0.96, cobertura: 0.94, ausentismo: 0.046, costoObjetivo: 8.3 },
  SMA: { eficiencia: 0.87, cobertura: 0.9, ausentismo: 0.062, costoObjetivo: 9.6 },
  PNU: { eficiencia: 0.85, cobertura: 0.92, ausentismo: 0.051, costoObjetivo: 9.1 },
  MIR: { eficiencia: 1.07, cobertura: 0.98, ausentismo: 0.028, costoObjetivo: 6.8 },
};

/** Jornada mensual de una persona a tiempo completo: 44 horas semanales. */
const HORAS_POR_PERSONA = 190;

async function sembrarPlantilla(
  prisma: PrismaClient,
  ventas: {
    corteId: string;
    tiendaId: string;
    ventasReal: number;
    unidadesReal: number;
    transaccionesReal: number;
  }[],
  tiendas: { perfil: { codigo: string; metrosCuadrados: number }; fila: { id: string } }[],
) {
  await sembrarAreas(prisma);
  const areas = await prisma.areaOperativa.findMany({ orderBy: { orden: "asc" } });
  const codigoPorTienda = new Map(tiendas.map(({ perfil, fila }) => [fila.id, perfil.codigo]));
  const metrosPorTienda = new Map(tiendas.map(({ perfil, fila }) => [fila.id, perfil.metrosCuadrados]));

  const registros = [];

  for (const [indice, venta] of ventas.entries()) {
    const codigo = codigoPorTienda.get(venta.tiendaId) ?? "ALT";
    const caracter = CARACTER_LABORAL[codigo] ?? CARACTER_LABORAL.ALT;
    const metros = metrosPorTienda.get(venta.tiendaId) ?? 1800;

    // La productividad mejora despacio a lo largo del año: es lo que se quiere poder ver.
    const maduracion = 1 + (indice % 14) * 0.0015;

    const filas: {
      areaId: string;
      horasTrabajadas: number;
      plantillaMeta: number;
      plantillaActiva?: number;
      volumen: { ventas: number | null; unidades: number | null; transacciones: number | null };
    }[] = [];

    for (const area of areas) {
      const semilla = indice * 31 + area.orden * 7;
      const reparto = REPARTO_AREAS[area.nombre];

      if (!reparto) {
        // Limpieza, seguridad y administración no se dimensionan por volumen sino por tamaño
        // de tienda: metros que cubrir, accesos que vigilar y una oficina que sostenerlos.
        const personas =
          area.nombre.startsWith("Limpieza")
            ? Math.max(3, Math.round(metros / 620))
            : area.nombre.startsWith("Seguridad")
              ? Math.max(2, Math.round(metros / 900))
              : Math.max(4, Math.round(metros / 320));
        // Aquí la cobertura ES el indicador, así que la meta es la dotación que hace falta y
        // el activo lo que de verdad hay: si ambos salieran del mismo número, la fila diría
        // 100 % siempre y no mediría nada.
        const plantillaMeta = Math.max(2, Math.round(personas * variar(semilla + 3, 0.08)));
        // En un equipo de cuatro o cinco la cobertura no es continua: falta una persona o no
        // falta. Multiplicar por 0,97 y redondear devolvía siempre la plantilla completa.
        const faltantes = ruido(semilla + 6) < (1 - caracter.cobertura) * 6 ? 1 : 0;
        const activa = Math.max(1, plantillaMeta - faltantes);
        filas.push({
          areaId: area.id,
          plantillaMeta,
          plantillaActiva: activa,
          horasTrabajadas: Math.round(activa * HORAS_POR_PERSONA),
          volumen: { ventas: null, unidades: null, transacciones: null },
        });
        continue;
      }

      const bruto =
        reparto.base === "VENTAS"
          ? venta.ventasReal
          : reparto.base === "UNIDADES"
            ? venta.unidadesReal
            : venta.transaccionesReal;
      const volumen = Math.round(bruto * reparto.parte * variar(semilla + 11, 0.06));

      // Las horas salen del estándar y del rendimiento del área: el índice queda controlado
      // y no es un número suelto que luego no se parece a la operación.
      const foco = FOCOS_DEBILES[codigo];
      const castigo = foco?.areas.includes(area.nombre) ? foco.factor : 1;
      const rendimiento = caracter.eficiencia * maduracion * castigo * variar(semilla + 17, 0.09);
      const horasTrabajadas = Math.max(
        8,
        Math.round(volumen / ((area.estandar ?? 100) * rendimiento)),
      );

      filas.push({
        areaId: area.id,
        plantillaMeta: 0, // se resuelve abajo, a partir del activo
        horasTrabajadas,
        volumen: {
          ventas: area.kpi === "SPLH" ? volumen : null,
          unidades: area.kpi === "UPLH" ? volumen : null,
          transacciones: area.kpi === "TPLH" ? volumen : null,
        },
      });
    }

    // El costo por hora se despeja del objetivo de nómina sobre ventas de la tienda: así el
    // KPI financiero cierra con la operación en vez de ser una cifra puesta a ojo.
    const horasTotales = filas.reduce((suma, fila) => suma + fila.horasTrabajadas, 0);
    const costoHora = (venta.ventasReal * (caracter.costoObjetivo / 100)) / (horasTotales || 1);

    for (const [posicion, fila] of filas.entries()) {
      const semilla = indice * 31 + posicion * 13 + 5;
      const ausentismo = caracter.ausentismo * variar(semilla, 0.3);
      const horasAusentismo = Math.round(fila.horasTrabajadas * ausentismo);

      // El activo sale de las horas que se trabajaron y la meta de dividirlo entre la cobertura.
      // En un área de una sola persona el redondeo da 100 %, que es la verdad: o está o no está.
      const activa = fila.plantillaActiva ?? Math.max(1, Math.round(fila.horasTrabajadas / HORAS_POR_PERSONA));
      const meta = fila.plantillaMeta || Math.max(activa, Math.round(activa / caracter.cobertura));

      registros.push({
        corteId: venta.corteId,
        tiendaId: venta.tiendaId,
        areaId: fila.areaId,
        plantillaMeta: meta,
        plantillaActiva: activa,
        // Programadas = trabajadas + ausentismo, que es lo que hace que la captura cuadre.
        horasProgramadas: fila.horasTrabajadas + horasAusentismo,
        horasTrabajadas: fila.horasTrabajadas,
        horasAusentismo,
        horasExtra: Math.round(fila.horasTrabajadas * 0.025 * variar(semilla + 4, 0.6)),
        ventas: fila.volumen.ventas,
        unidades: fila.volumen.unidades,
        transacciones: fila.volumen.transacciones,
        costoNomina: Math.round(fila.horasTrabajadas * costoHora),
        origen: "MANUAL",
      });
    }
  }

  for (let i = 0; i < registros.length; i += 500) {
    await prisma.registroPlantilla.createMany({ data: registros.slice(i, i + 500) });
  }
}

async function sembrarAreas(prisma: PrismaClient) {
  await prisma.areaOperativa.createMany({
    data: AREAS_OPERATIVAS.map((area, indice) => ({
      ...area,
      usaVentaTienda: area.usaVentaTienda ?? false,
      orden: indice + 1,
    })),
  });
}

export async function vaciarDatos(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE tabla text;
    BEGIN
      FOR tabla IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', tabla);
      END LOOP;
    END $$;
  `);
}

const UMBRALES = [
  { clave: "CUMPLIMIENTO_MIN", etiqueta: "Cumplimiento mínimo creíble", valor: 50, unidad: "PORCENTAJE" },
  { clave: "CUMPLIMIENTO_MAX", etiqueta: "Cumplimiento máximo creíble", valor: 150, unidad: "PORCENTAJE" },
  { clave: "AJUSTE_MAX_PCT", etiqueta: "Ajuste máximo sobre ventas", valor: 1.2, unidad: "PORCENTAJE" },
  { clave: "AJUSTE_MIN_PCT", etiqueta: "Ajuste mínimo para tomarlo en cuenta", valor: 0.1, unidad: "PORCENTAJE" },
  { clave: "FACTOR_ATIPICO", etiqueta: "Factor de desviación para marcar un valor atípico", valor: 3, unidad: "FACTOR" },
  { clave: "SALTO_MAX_PCT", etiqueta: "Salto máximo entre cortes", valor: 40, unidad: "PORCENTAJE" },
  { clave: "TOLERANCIA_SUBTOTAL", etiqueta: "Tolerancia al comparar subtotales", valor: 1, unidad: "PORCENTAJE" },
  { clave: "MARGEN_MIN_PCT", etiqueta: "Margen bruto mínimo aceptable", valor: 16, unidad: "PORCENTAJE" },
];

async function sembrarUmbrales(prisma: PrismaClient) {
  await prisma.umbral.deleteMany();
  await prisma.umbral.createMany({ data: UMBRALES });
}

/** Referencias de supermercado de alimentos, del orden de las que publican NRF e IGD. */
const BENCHMARKS = [
  { clave: "MB_PCT", etiqueta: "Margen bruto", valor: 22.0, unidad: "PORCENTAJE", fuente: "NRF/IGD" },
  { clave: "UPT", etiqueta: "Unidades por transacción", valor: 2.6, unidad: "FACTOR", fuente: "NRF/IGD" },
  { clave: "RPT", etiqueta: "Ticket promedio (RPT)", valor: 29.0, unidad: "USD", fuente: "NRF/IGD" },
  { clave: "ASP", etiqueta: "Precio medio por unidad (ASP)", valor: 11.2, unidad: "USD", fuente: "NRF/IGD" },
  { clave: "MERMA_PCT", etiqueta: "Merma sobre ventas", valor: 1.0, unidad: "PORCENTAJE", fuente: "NRF/IGD" },
  { clave: "AJUSTES_PCT", etiqueta: "Ajustes totales sobre ventas", valor: 1.5, unidad: "PORCENTAJE", fuente: "Interno" },
];

async function sembrarBenchmarks(prisma: PrismaClient) {
  await prisma.benchmark.deleteMany();
  await prisma.benchmark.createMany({
    data: BENCHMARKS.map((b) => ({ ...b, nota: "Valor de demostración." })),
  });
}

async function sembrarPerfil(prisma: PrismaClient, zonaPropiaId: string) {
  await prisma.perfil.create({
    data: {
      id: "maestro",
      nombre: "José García",
      cargo: "Director de Operaciones",
      marca: "JG Operaciones",
      iniciales: "JG",
      zonaPropiaId,
      contexto:
        "Gestiono las 6 tiendas de la Zona Metropolitana de Supermercados Vega y las comparo " +
        "contra el resto de la cadena. Mantengo el Tablero de Control de Ventas y el Reporte " +
        "de Ajustes por Tipología corte a corte, detecto inconsistencias en la data fuente y " +
        "convierto los números en presentaciones de tienda, informes ejecutivos y planes de acción.",
      instruccionesCerebro:
        "Analiza con criterio de director de operaciones retail: crítico, preciso y orientado a " +
        "ejecución en tienda. Usa benchmarks internacionales de supermercado (NRF/IGD), prioriza " +
        "por $ de oportunidad, separa causa raíz de síntoma y di explícitamente qué no se puede " +
        "concluir con los datos disponibles.",
    },
  });
}

async function sembrarPlanes(
  prisma: PrismaClient,
  zonaId: string,
  tiendas: { perfil: (typeof TIENDAS)[number]; fila: { id: string } }[],
  corteId: string,
) {
  const sanMarcos = tiendas.find((t) => t.perfil.codigo === "SMA")!;
  const puertoNuevo = tiendas.find((t) => t.perfil.codigo === "PNU")!;

  await prisma.planAccion.create({
    data: {
      titulo: "Recuperar margen en Vega San Marcos",
      alcance: "TIENDA",
      tiendaId: sanMarcos.fila.id,
      corteId,
      estado: "ACTIVO",
      oportunidadUsd: 96_400,
      diagnostico:
        "San Marcos cierra con 16,9 % de margen bruto contra 22,0 % de referencia y 20,7 % de " +
        "la zona. La merma va en 1,12 % de ventas, la más alta de la zona, y el " +
        "ajuste de inventario también encabeza las seis tiendas. El ticket promedio de $22,6 es " +
        "el más bajo, pero el problema no es de venta sino de lo que se pierde antes de venderla.",
      metas: {
        create: [
          { indicador: "Margen bruto", valorActual: 16.9, valorObjetivo: 19.5, unidad: "PORCENTAJE" },
          { indicador: "Merma sobre ventas", valorActual: 1.12, valorObjetivo: 0.85, unidad: "PORCENTAJE" },
          { indicador: "Oportunidad recuperable", valorActual: 0, valorObjetivo: 96_400, unidad: "USD" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Inventario ciclíco diario en carnicería y charcutería; cuadre firmado por turno.", responsable: "Gerente de tienda", estado: "EN_CURSO" },
          { mes: 1, descripcion: "Revisar mermas de frutas y verduras contra pedido: ajustar pedido a rotación real.", responsable: "Jefe de perecederos", estado: "EN_CURSO" },
          { mes: 2, descripcion: "Capacitación de recepción y control de temperatura en cadena de frío.", responsable: "Jefe de almacén", estado: "PENDIENTE" },
          { mes: 3, descripcion: "Auditoría de precios y cuadre de inventario general.", responsable: "Contraloría", estado: "PENDIENTE" },
        ],
      },
    },
  });

  await prisma.planAccion.create({
    data: {
      titulo: "Acelerar la rampa de Vega Puerto Nuevo",
      alcance: "TIENDA",
      tiendaId: puertoNuevo.fila.id,
      corteId,
      estado: "ACTIVO",
      oportunidadUsd: 148_000,
      diagnostico:
        "Con cinco meses abierta, Puerto Nuevo va al 96 % de su meta y todavía por debajo del " +
        "potencial de su plaza. El ticket de $26,9 está en línea con la zona, así que el problema " +
        "es de tráfico, no de conversión: falta que la plaza la conozca.",
      metas: {
        create: [
          { indicador: "Transacciones", valorActual: 41_600, valorObjetivo: 52_000, unidad: "UNIDADES" },
          { indicador: "Logro contra meta", valorActual: 96, valorObjetivo: 102, unidad: "PORCENTAJE" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Campaña de apertura en radio local y volanteo en tres urbanizaciones vecinas.", responsable: "Mercadeo", estado: "EN_CURSO" },
          { mes: 2, descripcion: "Ampliar horario a domingos y feriados durante la temporada alta.", responsable: "Gerente de tienda", estado: "PENDIENTE" },
          { mes: 3, descripcion: "Medir recurrencia de clientes y ajustar surtido a la canasta de la zona.", responsable: "Categorías", estado: "PENDIENTE" },
        ],
      },
    },
  });

  await prisma.planAccion.create({
    data: {
      titulo: "Bajar el ajuste de carga y descarga en la zona",
      alcance: "ZONA",
      zonaId,
      corteId,
      estado: "BORRADOR",
      oportunidadUsd: 54_200,
      diagnostico:
        "Carga y descarga pesa 0,26 % de la venta de la zona, por encima de lo razonable para " +
        "el volumen que se maneja. Es la tipología más dependiente de proceso —quién recibe, " +
        "con qué conteo, contra qué documento— y por eso la más corregible.",
      metas: {
        create: [
          { indicador: "Carga y descarga sobre ventas", valorActual: 0.26, valorObjetivo: 0.16, unidad: "PORCENTAJE" },
        ],
      },
      hitos: {
        create: [
          { mes: 1, descripcion: "Estandarizar el protocolo de recepción en las seis tiendas.", responsable: "Operaciones", estado: "PENDIENTE" },
          { mes: 2, descripcion: "Doble conteo obligatorio en proveedores con más diferencia histórica.", responsable: "Jefes de almacén", estado: "PENDIENTE" },
        ],
      },
    },
  });
}


/**
 * Un año de datos perfectos no existe, y una pantalla de alertas vacía no demuestra nada:
 * lo que distingue a esta herramienta de una hoja de cálculo es que encuentra lo que no
 * cuadra. El corte en curso lleva dos incidencias de las que pasan de verdad, y el motor
 * las detecta por su cuenta — las alertas no se escriben a mano.
 *
 * Las dos son de ajuste, no de venta, a propósito: un Meta y Real invertidos dejaría una
 * tienda al 240 % en el tablero de portada, y quien lo ve por primera vez no piensa "la
 * aplicación detectó un error", piensa que la aplicación está rota.
 */
async function sembrarAlertas(
  prisma: PrismaClient,
  corteActualId: string,
  corteMedioId: string,
  tiendas: { perfil: (typeof TIENDAS)[number]; fila: { id: string } }[],
) {
  const porCodigo = (codigo: string) => tiendas.find((t) => t.perfil.codigo === codigo)!.fila.id;

  const incidencias = [
    // Un conteo cíclico que se cargó completo de golpe en vez de repartido.
    { tiendaId: porCodigo("SMA"), tipologia: "INVENTARIO", porcentaje: -3.4 },
    // Una cadena de frío que falló un fin de semana.
    { tiendaId: porCodigo("CVE"), tipologia: "MERMA", porcentaje: -4.1 },
  ];

  for (const incidencia of incidencias) {
    const venta = (
      await prisma.registroVentas.findUnique({
        where: { corteId_tiendaId: { corteId: corteActualId, tiendaId: incidencia.tiendaId } },
      })
    )?.ventasReal;
    await prisma.registroAjuste.update({
      where: {
        corteId_tiendaId_tipologia: {
          corteId: corteActualId,
          tiendaId: incidencia.tiendaId,
          tipologia: incidencia.tipologia,
        },
      },
      data: {
        porcentaje: incidencia.porcentaje,
        monto: Math.round(((venta ?? 0) * incidencia.porcentaje) / 100),
      },
    });
  }

  // Dos errores de captura de plantilla, de los que ocurren de verdad: una hoja donde las
  // horas trabajadas no cuadran con programadas menos ausentismo, y un volumen cargado en la
  // escala equivocada. No se corrigen: se dejan para que el motor los encuentre y para que
  // se vea que la aplicación marca y explica en vez de arreglar por su cuenta.
  const descuadre = await prisma.registroPlantilla.findFirst({
    where: { corteId: corteActualId, tiendaId: porCodigo("ROB"), area: { kpi: "TPLH" } },
    orderBy: { area: { orden: "asc" } },
  });
  if (descuadre) {
    await prisma.registroPlantilla.update({
      where: { id: descuadre.id },
      data: { horasTrabajadas: Math.round((descuadre.horasTrabajadas ?? 0) * 0.88) },
    });
  }

  const escala = await prisma.registroPlantilla.findFirst({
    where: { corteId: corteActualId, tiendaId: porCodigo("MIR"), area: { kpi: "UPLH" } },
    orderBy: { area: { orden: "desc" } },
  });
  if (escala) {
    // Bultos cargados como unidades sueltas: el área queda rindiendo varias veces el estándar.
    await prisma.registroPlantilla.update({
      where: { id: escala.id },
      data: { unidades: Math.round((escala.unidades ?? 0) * 3.4) },
    });
  }

  const { sincronizarAlertas } = await import("@/lib/validacion");
  await sincronizarAlertas(corteActualId);
  await sincronizarAlertas(corteMedioId);

  // Una del corte anterior ya atendida: se ve que las decisiones humanas quedan registradas
  // y que el motor no vuelve a levantar lo que alguien ya revisó.
  const revisable = await prisma.alerta.findFirst({
    where: { corteId: corteMedioId, estado: "ABIERTA" },
    orderBy: { severidad: "asc" },
  });
  if (revisable) {
    await prisma.alerta.update({
      where: { id: revisable.id },
      data: {
        estado: "REVISADA",
        nota: "Confirmado con la tienda: fue una liquidación de temporada autorizada, no un error de registro.",
      },
    });
  }
}

/** Lo que el usuario sabe y la data no dice. Alimenta el contexto del análisis. */
async function sembrarNotas(
  prisma: PrismaClient,
  zonaId: string,
  tiendas: { perfil: (typeof TIENDAS)[number]; fila: { id: string } }[],
) {
  const porCodigo = (codigo: string) => tiendas.find((t) => t.perfil.codigo === codigo)!.fila.id;

  await prisma.notaMemoria.createMany({
    data: [
      {
        texto:
          "Puerto Nuevo abrió en abril. Hasta que cumpla doce meses no entra en el comparativo " +
          "interanual: su crecimiento es rampa de apertura, no desempeño.",
        etiqueta: "OPERACION",
        tiendaId: porCodigo("PNU"),
      },
      {
        texto:
          "San Marcos arrastra un problema de margen desde el cambio de proveedor de carnes " +
          "en febrero. El plan de acción está abierto.",
        etiqueta: "COMERCIAL",
        tiendaId: porCodigo("SMA"),
      },
      {
        texto:
          "Costa Verde es estacional: julio, agosto y diciembre pesan el doble que el resto " +
          "del año por el turismo. Leer sus caídas de mayo y septiembre en ese contexto.",
        etiqueta: "OPERACION",
        tiendaId: porCodigo("CVE"),
      },
      {
        texto:
          "El cierre de mes de la zona se revisa el primer martes. Los cortes acumulados de " +
          "mitad de mes son de seguimiento, no de logro.",
        etiqueta: "OPERACION",
        zonaId,
      },
    ],
  });
}


/**
 * Análisis ya cargado. La pantalla de Análisis se llena con una llamada al modelo, y en una
 * demostración eso significa gastar dinero cada vez que alguien pulsa el botón por curiosidad.
 * Aquí se deja guardado uno, etiquetado como "Demostración" para que la pantalla diga de dónde
 * salió y nadie lo confunda con una lectura recién pedida.
 *
 * Las cifras no se escriben a mano: se derivan de lo que el demo acaba de generar. Un análisis
 * que cita un número que no está en el tablero destruye justo la confianza que debe construir.
 */
async function sembrarAnalisis(
  prisma: PrismaClient,
  corte: { id: string; nombre: string; diasTranscurridos: number | null; diasDelMes: number | null },
  zonaId: string,
) {
  const registros = await prisma.registroVentas.findMany({
    where: { corteId: corte.id },
    include: { tienda: { select: { nombre: true, zonaId: true } } },
  });
  const propios = registros.filter((r) => r.tienda.zonaId === zonaId);
  if (!propios.length) return;

  const sumar = (campo: "ventasMeta" | "ventasReal" | "transaccionesReal" | "unidadesReal") =>
    propios.reduce((total, r) => total + (r[campo] ?? 0), 0);

  const meta = sumar("ventasMeta");
  const real = sumar("ventasReal");
  const transacciones = sumar("transaccionesReal");
  const logro = meta ? (real / meta) * 100 : 0;

  // El margen de un conjunto se pondera por venta: promediar porcentajes falsea el total.
  const margen =
    real > 0
      ? propios.reduce((t, r) => t + (r.ventasReal ?? 0) * (r.margenBrutoReal ?? 0), 0) / real
      : 0;
  const ticket = transacciones ? real / transacciones : 0;

  const dias = corte.diasTranscurridos ?? 0;
  const delMes = corte.diasDelMes ?? 0;
  const proyeccion = dias && delMes ? (real / dias) * delMes : null;
  const metaMes = dias && delMes ? (meta / dias) * delMes : null;

  const conBrecha = propios
    .map((r) => ({
      nombre: r.tienda.nombre,
      brecha: (r.ventasReal ?? 0) - (r.ventasMeta ?? 0),
      logro: r.ventasMeta ? ((r.ventasReal ?? 0) / r.ventasMeta) * 100 : 0,
      margen: r.margenBrutoReal ?? 0,
    }))
    .sort((a, b) => a.brecha - b.brecha);

  const peor = conBrecha[0];
  const mejor = conBrecha[conBrecha.length - 1];
  const menorMargen = [...conBrecha].sort((a, b) => a.margen - b.margen)[0];
  const ajustes = await prisma.registroAjuste.findMany({
    where: { corteId: corte.id, tiendaId: { in: propios.map((r) => r.tiendaId) } },
    include: { tienda: { select: { nombre: true } } },
  });
  const totalAjustes = ajustes.reduce((t, a) => t + a.monto, 0);
  const pesoAjustes = real ? (totalAjustes / real) * 100 : 0;
  const porTipologia = new Map<string, number>();
  for (const ajuste of ajustes) {
    porTipologia.set(ajuste.tipologia, (porTipologia.get(ajuste.tipologia) ?? 0) + ajuste.monto);
  }
  const dominante = [...porTipologia.entries()].sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  )[0];
  const peorAjuste = [...ajustes]
    .sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto))[0];

  const dinero = (valor: number) =>
    `$${Math.round(Math.abs(valor)).toLocaleString("es-VE")}`;
  const pct = (valor: number) => `${valor.toFixed(1).replace(".", ",")} %`;

  const analisis = {
    lecturaGeneral:
      `La zona cierra ${corte.nombre} con ${dinero(real)} sobre una meta de ${dinero(meta)}: ` +
      `${pct(logro)} de cumplimiento con ${dias} de ${delMes} días corridos. ` +
      (proyeccion && metaMes
        ? `Al ritmo actual el mes cerraría en ${dinero(proyeccion)} contra una meta de ` +
          `${dinero(metaMes)}, o sea ${proyeccion >= metaMes ? "por encima" : "por debajo"} ` +
          `por ${dinero(proyeccion - metaMes)}. `
        : "") +
      `El titular no es la venta, que va en línea: es el margen. La zona opera a ` +
      `${pct(margen)} de margen bruto contra una referencia de 22,0 %, y los ajustes se ` +
      `llevan ${pct(Math.abs(pesoAjustes))} de la venta. Entre las dos cosas se va más dinero ` +
      `del que separa a la zona de su meta.\n\n` +
      `${peor.nombre} es la que más pesa en la brecha, con ${dinero(peor.brecha)} por debajo ` +
      `y ${pct(peor.logro)} de logro. ${mejor.nombre} compensa con ${pct(mejor.logro)}. ` +
      `El ticket promedio de la zona está en $${ticket.toFixed(2).replace(".", ",")}: ` +
      `sostiene la venta, así que el problema no es de conversión en caja sino de lo que se ` +
      `pierde antes de llegar a ella.`,

    hallazgos: [
      {
        titulo: `El margen de ${menorMargen.nombre} está ${(22 - menorMargen.margen).toFixed(1).replace(".", ",")} puntos por debajo de la referencia`,
        ambito: menorMargen.nombre,
        evidencia: `Margen bruto de ${pct(menorMargen.margen)} contra 22,0 % de referencia y ${pct(margen)} de la zona.`,
        causaProbable:
          "Un margen persistentemente bajo con ticket en línea apunta a costo de mercancía o a " +
          "pérdida en perecederos, no a política de precio. El síntoma es el margen; la causa " +
          "está en compra o en manejo de producto.",
        severidad: "ALTA" as const,
      },
      peorAjuste
        ? {
            titulo: `${peorAjuste.tienda.nombre} concentra el ajuste más grande del corte`,
            ambito: peorAjuste.tienda.nombre,
            evidencia: `${dinero(peorAjuste.monto)} en ${ETIQUETA_TIPOLOGIA_DEMO[peorAjuste.tipologia] ?? peorAjuste.tipologia}, ${pct(Math.abs(peorAjuste.porcentaje ?? 0))} de su venta.`,
            causaProbable:
              "Un ajuste puntual de esta magnitud rara vez es deterioro gradual: suele ser un " +
              "evento concreto —un conteo cargado de golpe, una falla de equipo— y conviene " +
              "aislarlo antes de leerlo como tendencia.",
            severidad: "ALTA" as const,
          }
        : null,
      {
        titulo: `Los ajustes se llevan ${pct(Math.abs(pesoAjustes))} de la venta de la zona`,
        ambito: "Zona",
        evidencia: dominante
          ? `${dinero(totalAjustes)} en total, de los cuales ${dinero(dominante[1])} son ${ETIQUETA_TIPOLOGIA_DEMO[dominante[0]] ?? dominante[0]}.`
          : `${dinero(totalAjustes)} en total.`,
        causaProbable:
          "La tipología dominante marca dónde está el dinero, pero no dónde está la causa: " +
          "merma alta con carga y descarga alta suele ser un mismo problema de recepción " +
          "visto desde dos ángulos.",
        severidad: "MEDIA" as const,
      },
      {
        titulo: `${peor.nombre} arrastra la brecha de la zona`,
        ambito: peor.nombre,
        evidencia: `${dinero(peor.brecha)} por debajo de meta, ${pct(peor.logro)} de logro.`,
        causaProbable:
          "Antes de tocar la meta conviene separar si falta tráfico o falta ticket: son dos " +
          "problemas distintos y se atacan con acciones distintas.",
        severidad: "MEDIA" as const,
      },
    ].filter((h): h is NonNullable<typeof h> => h !== null),

    recomendaciones: [
      {
        accion:
          `Auditar el costo de mercancía de las tres categorías de mayor peso en ${menorMargen.nombre}, ` +
          "contrastando precio de compra contra el de las demás tiendas de la zona.",
        ambito: menorMargen.nombre,
        impactoUsd: Math.round(((22 - menorMargen.margen) / 100) * (real / propios.length)),
        esfuerzo: "BAJO" as const,
        plazo: "INMEDIATO" as const,
        comoMedirlo: `Margen bruto de la tienda por encima de ${(menorMargen.margen + 1.5).toFixed(1).replace(".", ",")} % en el próximo corte.`,
      },
      {
        accion:
          "Estandarizar el protocolo de recepción en las seis tiendas: doble conteo obligatorio " +
          "y cuadre firmado por turno contra el documento del proveedor.",
        ambito: "Zona",
        impactoUsd: Math.round(Math.abs(totalAjustes) * 0.18),
        esfuerzo: "MEDIO" as const,
        plazo: "30_DIAS" as const,
        comoMedirlo: "Carga y descarga por debajo de 0,20 % sobre ventas en el cierre del mes.",
      },
      {
        accion:
          `Abrir el desglose por categoría del ajuste de ${peorAjuste?.tienda.nombre ?? "la tienda afectada"} ` +
          "y confirmar si sale de una o dos familias o está repartido.",
        ambito: peorAjuste?.tienda.nombre ?? "Zona",
        impactoUsd: null,
        esfuerzo: "BAJO" as const,
        plazo: "INMEDIATO" as const,
        comoMedirlo:
          "Saber si es un evento aislado o un método: si sale de una familia, es evento; si " +
          "está repartido, hay que revisar el procedimiento de conteo.",
      },
      {
        accion:
          `Revisar la mezcla de ${peor.nombre}: comparar su composición por categoría contra ` +
          "la tienda de mejor logro de la zona y ajustar surtido en las que estén por debajo.",
        ambito: peor.nombre,
        impactoUsd: Math.round(Math.abs(peor.brecha) * 0.35),
        esfuerzo: "MEDIO" as const,
        plazo: "30_DIAS" as const,
        comoMedirlo: `Logro por encima de ${Math.min(100, peor.logro + 4).toFixed(0)} % en el próximo corte.`,
      },
    ],

    escenarioCierre: {
      piso: proyeccion ? Math.round(proyeccion * 0.94) : null,
      esperado: proyeccion ? Math.round(proyeccion) : null,
      techo: proyeccion ? Math.round(proyeccion * 1.06) : null,
      supuestos: [
        `Ritmo diario actual de ${dinero(dias ? real / dias : 0)} sostenido hasta el cierre.`,
        `Quedan ${Math.max(delMes - dias, 0)} días del período.`,
        "La amplitud de ±6 % recoge la variación observada entre semanas del mismo mes.",
        "No incorpora efecto de quincena ni de días festivos: con venta diaria se podría afinar.",
      ],
    },

    loQueNoSePuedeConcluir: [
      "Si la brecha viene de menos clientes o de menos compra por cliente: haría falta abrir " +
        "transacciones y ticket por día de la semana, y hoy solo se carga el acumulado.",
      "Si el margen bajo es de compra o de merma no registrada: exige cruzar costo de " +
        "mercancía contra el ajuste por tipología de la misma categoría.",
      "Qué parte del ajuste de inventario es diferencia real y qué parte es método de conteo: " +
        "se resuelve con el detalle por categoría, no con el total.",
      "Cómo se compara la zona contra el resto de la cadena en margen: las otras zonas entran " +
        "solo con su total y no traen el detalle por tienda.",
    ],
  };

  await prisma.analisis.create({
    data: {
      corteId: corte.id,
      // CADENA es el alcance con el que guarda la acción real y el que busca la pantalla:
      // un análisis con otro alcance queda invisible aunque esté en la base.
      alcance: "CADENA",
      zonaId,
      contenido: JSON.stringify(analisis),
      modelo: "Demostración",
    },
  });
}

const ETIQUETA_TIPOLOGIA_DEMO: Record<string, string> = {
  MERMA: "Merma",
  MERCANCIA_DANADA: "Mercancía Dañada",
  CARGA_DESCARGA: "Carga y Descarga",
  INVENTARIO: "Inventario",
  VENTAS: "Ventas",
};


/**
 * Checklists de operación con sus inspecciones. Son las hojas que se recorren en tienda, y lo
 * que hace útil el módulo no es marcar OK sino lo que pasa con lo que sale No OK: la
 * observación, la corrección con dueño y fecha, y su estatus hasta cerrarse. Por eso el demo
 * trae hallazgos en los tres estados —verificado, en curso y uno vencido—: una hoja donde todo
 * está en verde no enseña para qué sirve la herramienta.
 */
const CHECKLISTS_DEMO = [
  {
    nombre: "Apertura de tienda",
    descripcion: "Lo que tiene que estar listo antes de abrir las puertas.",
    frecuencia: "DIARIA",
    puntos: [
      { area: "Salón", actividad: "Piso limpio, seco y sin obstáculos en pasillos principales" },
      { area: "Salón", actividad: "Iluminación completa en salón y vitrinas" },
      { area: "Salón", actividad: "Carritos y cestas disponibles y en buen estado" },
      { area: "Perecederos", actividad: "Cámaras de frío dentro de rango de temperatura", critico: true },
      { area: "Perecederos", actividad: "Vitrinas cargadas y producto del día rotulado" },
      { area: "Perecederos", actividad: "Registro de temperatura del turno firmado", critico: true },
      { area: "Caja", actividad: "Fondo de caja cuadrado y entregado por turno", critico: true },
      { area: "Caja", actividad: "Impresoras con papel y lectores operativos" },
      { area: "Personal", actividad: "Dotación completa según horario del día" },
      { area: "Personal", actividad: "Uniforme e identificación visible" },
      { area: "Almacén", actividad: "Mercancía recibida del día ubicada y no en pasillo" },
    ],
  },
  {
    nombre: "Cierre de tienda",
    descripcion: "Lo que no puede quedar pendiente al bajar la santamaría.",
    frecuencia: "DIARIA",
    puntos: [
      { area: "Caja", actividad: "Arqueo de cajas cuadrado y diferencias documentadas", critico: true },
      { area: "Caja", actividad: "Depósito preparado y resguardado" },
      { area: "Perecederos", actividad: "Producto de vida corta retirado y cargado como merma", critico: true },
      { area: "Perecederos", actividad: "Cámaras y vitrinas cerradas y en temperatura", critico: true },
      { area: "Salón", actividad: "Reposición dejada lista para la apertura" },
      { area: "Salón", actividad: "Limpieza general de salón y baños" },
      { area: "Seguridad", actividad: "Alarmas activadas y accesos cerrados", critico: true },
      { area: "Seguridad", actividad: "Cámaras de seguridad grabando" },
    ],
  },
  {
    nombre: "Auditoría de perecederos",
    descripcion: "Donde se pierde el margen: frío, rotación y registro de merma.",
    frecuencia: "SEMANAL",
    puntos: [
      { area: "Cadena de frío", actividad: "Temperaturas registradas en los tres turnos", critico: true },
      { area: "Cadena de frío", actividad: "Termómetros calibrados y con etiqueta vigente" },
      { area: "Rotación", actividad: "PEPS aplicado: lo más viejo al frente" },
      { area: "Rotación", actividad: "Sin producto vencido en exhibición", critico: true },
      { area: "Rotación", actividad: "Producto próximo a vencer identificado y con acción" },
      { area: "Registro", actividad: "Merma del día cargada en sistema el mismo día" },
      { area: "Registro", actividad: "Merma soportada con acta firmada" },
      { area: "Higiene", actividad: "Superficies, cuchillos y sierras sanitizados" },
      { area: "Higiene", actividad: "Empaque y rotulado con fecha y peso correctos" },
    ],
  },
  {
    nombre: "Control de precios y exhibición",
    descripcion: "Que lo que dice la góndola sea lo que cobra la caja.",
    frecuencia: "SEMANAL",
    puntos: [
      { area: "Precios", actividad: "Precio de góndola coincide con el del sistema", critico: true },
      { area: "Precios", actividad: "Promociones vigentes señalizadas y con fecha" },
      { area: "Precios", actividad: "Sin etiquetas de promoción vencida en salón", critico: true },
      { area: "Exhibición", actividad: "Frente de góndola completo en categorías vitales" },
      { area: "Exhibición", actividad: "Planograma respetado en pasillos de alto tránsito" },
      { area: "Exhibición", actividad: "Puntas de góndola con la promoción del período" },
    ],
  },
] as const;

/** Hallazgos plausibles, con su corrección y el estado en que estaría hoy. */
const HALLAZGOS_DEMO = [
  {
    actividad: "Cámaras de frío dentro de rango de temperatura",
    observacion:
      "Cámara de lácteos en 8 °C, dos grados por encima del rango. El registro del turno de la noche está en blanco.",
    correccion:
      "Técnico revisa el condensador el mismo día y se retoma el registro por turno con firma del responsable de perecederos.",
    responsable: "Jefe de perecederos",
    estado: "VERIFICADO",
    diasLimite: -6,
  },
  {
    actividad: "Precio de góndola coincide con el del sistema",
    observacion:
      "Once referencias de víveres con precio de góndola por debajo del sistema. La caja cobra más de lo exhibido.",
    correccion:
      "Barrido completo de etiquetas en víveres y cambio del procedimiento: el cambio de precio se imprime y se coloca el mismo día en que se carga.",
    responsable: "Encargada de salón",
    estado: "EN_CURSO",
    diasLimite: 3,
  },
  {
    actividad: "Merma del día cargada en sistema el mismo día",
    observacion:
      "Merma de carnicería de tres días acumulada sin cargar. Explica parte del salto de inventario del corte.",
    correccion:
      "Carga diaria obligatoria antes del cierre y cuadre semanal contra el acta física.",
    responsable: "Gerente de tienda",
    estado: "EN_CURSO",
    diasLimite: -2,
  },
  {
    actividad: "Sin producto vencido en exhibición",
    observacion: "Dos referencias de charcutería vencidas el día anterior, aún en vitrina.",
    correccion: "Retiro inmediato y revisión de fechas dos veces al día en perecederos.",
    responsable: "Jefe de perecederos",
    estado: "RESUELTO",
    diasLimite: -4,
  },
  {
    actividad: "Mercancía recibida del día ubicada y no en pasillo",
    observacion: "Pallets de bebidas en pasillo de tránsito del almacén desde la recepción de ayer.",
    correccion: "Ubicación dentro de las dos horas siguientes a la recepción.",
    responsable: "Jefe de almacén",
    estado: "PENDIENTE",
    diasLimite: 5,
  },
  {
    actividad: "Frente de góndola completo en categorías vitales",
    observacion: "Huecos en víveres y lácteos a media mañana, con producto disponible en almacén.",
    correccion: "Segunda ronda de reposición a las 11:00 los días de mayor tráfico.",
    responsable: "Encargada de salón",
    estado: "PENDIENTE",
    diasLimite: 7,
  },
] as const;

async function sembrarChecklists(
  prisma: PrismaClient,
  tiendas: { perfil: (typeof TIENDAS)[number]; fila: { id: string } }[],
  corteId: string,
) {
  type Plantilla = { id: string; puntos: { id: string; actividad: string }[] };
  const plantillas: Plantilla[] = [];
  for (const [indice, definicion] of CHECKLISTS_DEMO.entries()) {
    const checklist = await prisma.checklist.create({
      data: {
        nombre: definicion.nombre,
        descripcion: definicion.descripcion,
        frecuencia: definicion.frecuencia,
        orden: indice + 1,
        puntos: {
          create: definicion.puntos.map((punto, orden) => ({
            actividad: punto.actividad,
            area: punto.area,
            critico: "critico" in punto ? punto.critico : false,
            orden: orden + 1,
          })),
        },
      },
      include: { puntos: true },
    });
    plantillas.push(checklist);
  }

  const hoy = new Date();
  const porActividad = new Map<string, (typeof HALLAZGOS_DEMO)[number]>(
    HALLAZGOS_DEMO.map((hallazgo) => [hallazgo.actividad as string, hallazgo]),
  );

  // Una ronda por tienda, alternando plantillas, en las tres semanas anteriores.
  const rondas = tiendas.flatMap((tienda, i) => [
    { tienda, plantilla: plantillas[i % plantillas.length], diasAtras: 2 + i * 2, cerrada: i > 1 },
    { tienda, plantilla: plantillas[(i + 2) % plantillas.length], diasAtras: 11 + i, cerrada: true },
  ]);

  for (const [indice, ronda] of rondas.entries()) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - ronda.diasAtras);

    const resultados = ronda.plantilla.puntos.map((punto, orden) => {
      const hallazgo = porActividad.get(punto.actividad);
      // Los hallazgos caen en la mitad de las rondas: una tienda con medio checklist en rojo
      // no es creíble, y una con todo en verde no enseña para qué sirve el módulo.
      const falla = Boolean(hallazgo) && indice % 2 === 0;

      if (!falla || !hallazgo) {
        return { puntoId: punto.id, cumple: ruido(indice * 31 + orden) > 0.96 ? "NO_APLICA" : "OK" };
      }

      const limite = new Date(fecha);
      limite.setDate(limite.getDate() + hallazgo.diasLimite + 7);
      return {
        puntoId: punto.id,
        cumple: "NO_OK",
        observacion: hallazgo.observacion,
        correccion: hallazgo.correccion,
        responsable: hallazgo.responsable,
        fechaLimite: limite,
        estado: hallazgo.estado,
      };
    });

    await prisma.inspeccion.create({
      data: {
        checklistId: ronda.plantilla.id,
        tiendaId: ronda.tienda.fila.id,
        corteId,
        fecha,
        responsable: "José García",
        estado: ronda.cerrada ? "CERRADA" : "ABIERTA",
        resultados: { create: resultados },
      },
    });
  }
}
