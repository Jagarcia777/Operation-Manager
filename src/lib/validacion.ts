import { mediana } from "@/lib/calculos";
import { prisma } from "@/lib/db";
import {
  ETIQUETA_TIPOLOGIA,
  TIPOLOGIAS,
  type Severidad,
  type Tipologia,
  type TipoAlerta,
} from "@/lib/dominio";

// Motor de validación. Marca lo que no cuadra y explica por qué; jamás corrige un dato.
// Las decisiones humanas mandan: una alerta revisada o descartada no vuelve a levantarse.

export type AlertaDetectada = {
  tipo: TipoAlerta;
  severidad: Severidad;
  tiendaId: string | null;
  indicador: string | null;
  valorObservado: number | null;
  valorEsperado: number | null;
  mensaje: string;
};

const UMBRALES_POR_DEFECTO: Record<string, number> = {
  CUMPLIMIENTO_MIN: 50,
  CUMPLIMIENTO_MAX: 150,
  AJUSTE_MAX_PCT: 1,
  AJUSTE_MIN_PCT: 0.1,
  FACTOR_ATIPICO: 3,
  SALTO_MAX_PCT: 40,
  TOLERANCIA_SUBTOTAL: 1,
  TOLERANCIA_HORAS_PCT: 2,
  INDICE_MAX: 2,
};

export async function leerUmbrales(): Promise<Record<string, number>> {
  const guardados = await prisma.umbral.findMany();
  const valores = { ...UMBRALES_POR_DEFECTO };
  for (const umbral of guardados) valores[umbral.clave] = umbral.valor;
  return valores;
}

/** Desviación absoluta mediana: mide dispersión sin que un solo caso extremo la distorsione. */
function desviacionMediana(valores: number[], centro: number): number | null {
  if (!valores.length) return null;
  return mediana(valores.map((valor) => Math.abs(valor - centro)));
}

export async function detectarAlertas(corteId: string): Promise<AlertaDetectada[]> {
  const umbrales = await leerUmbrales();
  const alertas: AlertaDetectada[] = [];

  const [corte, tiendas, ventas, ajustes, plantilla] = await Promise.all([
    prisma.corte.findUnique({ where: { id: corteId } }),
    prisma.tienda.findMany({ where: { activa: true } }),
    prisma.registroVentas.findMany({ where: { corteId } }),
    prisma.registroAjuste.findMany({ where: { corteId } }),
    prisma.registroPlantilla.findMany({ where: { corteId }, include: { area: true } }),
  ]);
  if (!corte) return alertas;

  const nombrePorTienda = new Map(tiendas.map((tienda) => [tienda.id, tienda.nombre]));
  const ventasPorTienda = new Map(ventas.map((registro) => [registro.tiendaId, registro]));
  // Ventas Corporativas no es una sucursal y no compite con ellas: su ticket es cincuenta veces
  // el de una tienda y en cualquier prueba de dispersión sería el atípico de todas.
  const comparables = tiendas.filter((tienda) => tienda.comparable);

  // El informe de la cadena llega con la columna de metas en cero para todas las sucursales:
  // el sistema emisor no las está cargando. Eso es un solo hallazgo, no veinticinco, y decirlo
  // una vez evita que la bandeja de alertas quede inservible el día de la primera carga.
  // Un corte diario no tiene meta porque el documento no la trae para el día: eso no es un
  // dato faltante sino la forma del informe, y repetirlo cada mañana convertiría la bandeja
  // en algo que nadie mira.
  const esperaMeta = corte.tipo !== "DIARIO";
  const conReal = ventas.filter((registro) => registro.ventasReal !== null);
  const sinMeta = conReal.filter((registro) => registro.ventasMeta === null);
  const faltanTodasLasMetas = esperaMeta && conReal.length > 1 && sinMeta.length === conReal.length;

  if (faltanTodasLasMetas) {
    alertas.push({
      tipo: "DATO_FALTANTE",
      severidad: "MEDIA",
      tiendaId: null,
      indicador: "ventas",
      valorObservado: null,
      valorEsperado: null,
      mensaje: `Ninguna de las ${conReal.length} sucursales del corte trae meta de ventas. Sin meta no hay cumplimiento ni brecha: el tablero muestra el real y deja el resto en blanco en vez de calcular contra cero.`,
    });
  }

  // 1. Datos faltantes: una tienda sin cifras deja el subtotal de su zona incompleto.
  for (const tienda of tiendas) {
    const registro = ventasPorTienda.get(tienda.id);
    if (!registro) {
      alertas.push({
        tipo: "DATO_FALTANTE",
        severidad: "ALTA",
        tiendaId: tienda.id,
        indicador: null,
        valorObservado: null,
        valorEsperado: null,
        mensaje: `${tienda.nombre} no tiene ventas cargadas en este corte; el subtotal de su zona queda incompleto.`,
      });
      continue;
    }
    // Si faltan todas las metas ya se dijo arriba de una vez; repetirlo por tienda es ruido.
    const falta =
      registro.ventasReal === null ||
      (registro.ventasMeta === null && esperaMeta && !faltanTodasLasMetas);
    if (falta) {
      alertas.push({
        tipo: "DATO_FALTANTE",
        severidad: "MEDIA",
        tiendaId: tienda.id,
        indicador: "ventas",
        valorObservado: registro.ventasReal,
        valorEsperado: registro.ventasMeta,
        mensaje: `${tienda.nombre} tiene incompleta la venta del corte (falta ${
          registro.ventasReal === null ? "el real" : "la meta"
        }).`,
      });
    }
  }

  // 2. Cumplimientos imposibles: casi siempre son Meta y Real intercambiados al cargar.
  for (const registro of ventas) {
    if (!registro.ventasReal || !registro.ventasMeta) continue;
    const cumplimiento = (registro.ventasReal / registro.ventasMeta) * 100;
    const nombre = nombrePorTienda.get(registro.tiendaId) ?? "Tienda";

    if (cumplimiento > umbrales.CUMPLIMIENTO_MAX || cumplimiento < umbrales.CUMPLIMIENTO_MIN) {
      alertas.push({
        tipo: "POSIBLE_INTERCAMBIO",
        severidad: "ALTA",
        tiendaId: registro.tiendaId,
        indicador: "ventas",
        valorObservado: Number(cumplimiento.toFixed(1)),
        valorEsperado: 100,
        mensaje: `${nombre} cierra con ${cumplimiento.toFixed(1)} % de cumplimiento en ventas. Revisar si Meta y Real quedaron invertidos al cargar el corte.`,
      });
    }
  }

  // 3. Ajustes atípicos: contra el umbral del negocio y contra la dispersión de la cadena.
  for (const tipologia of TIPOLOGIAS) {
    const delTipo = ajustes.filter((ajuste) => ajuste.tipologia === tipologia);
    const porcentajes = delTipo
      .map((ajuste) => {
        if (!comparables.some((tienda) => tienda.id === ajuste.tiendaId)) return null;
        const venta = ventasPorTienda.get(ajuste.tiendaId)?.ventasReal ?? null;
        if (!venta) return null;
        return { tiendaId: ajuste.tiendaId, valor: (ajuste.monto / venta) * 100 };
      })
      .filter((entrada): entrada is { tiendaId: string; valor: number } => entrada !== null);

    if (!porcentajes.length) continue;

    // Los ajustes vienen en negativo por ser en contra: lo que importa es la magnitud.
    const magnitudes = porcentajes.map((entrada) => Math.abs(entrada.valor));
    const centro = mediana(magnitudes) ?? 0;
    const dispersion = desviacionMediana(magnitudes, centro);

    for (const entrada of porcentajes) {
      const nombre = nombrePorTienda.get(entrada.tiendaId) ?? "Tienda";
      const magnitud = Math.abs(entrada.valor);
      const superaUmbral = magnitud > umbrales.AJUSTE_MAX_PCT;
      // La dispersión sola delata cifras que no valen la pena: cuando toda la cadena está en
      // centésimas de punto, cualquier diferencia supera tres desviaciones y la alerta acaba
      // diciendo que 0,01 % está "muy por encima" de 0,01 %. Debajo del piso no se levanta.
      const superaDispersion =
        magnitud >= umbrales.AJUSTE_MIN_PCT &&
        dispersion !== null &&
        dispersion > 0 &&
        magnitud - centro > umbrales.FACTOR_ATIPICO * dispersion;

      if (superaUmbral || superaDispersion) {
        alertas.push({
          tipo: "VALOR_ATIPICO",
          severidad: superaUmbral && superaDispersion ? "ALTA" : "MEDIA",
          tiendaId: entrada.tiendaId,
          indicador: tipologia,
          valorObservado: Number(entrada.valor.toFixed(2)),
          valorEsperado: Number(centro.toFixed(2)),
          mensaje: `${nombre} registra un ajuste de ${entrada.valor.toFixed(2)} % sobre ventas en ${ETIQUETA_TIPOLOGIA[tipologia as Tipologia]}, frente a una mediana de cadena de ${centro.toFixed(2)} %. Confirmar si es real o un error de registro.`,
        });
      }
    }
  }

  // 4. Saltos contra el corte anterior comparable.
  const anterior = await prisma.corte.findFirst({
    where: { fechaFin: { lt: corte.fechaFin }, tipo: corte.tipo },
    orderBy: { fechaFin: "desc" },
  });

  // Dos cortes acumulados no cubren los mismos días: comparar los totales mide días
  // transcurridos, no desempeño —un corte al 23 lleva de suyo mucho más que uno al 12—.
  // Se compara la venta por día. Si no se sabe cuántos días cubre alguno de los dos,
  // no se compara: levantar una alerta sobre una base inventada es peor que no levantarla.
  const diasDe = (c: { diasTranscurridos: number | null; diasDelMes: number | null }) =>
    c.diasTranscurridos ?? c.diasDelMes ?? null;

  if (anterior) {
    const diasAhora = diasDe(corte);
    const diasAntes = diasDe(anterior);

    if (diasAhora && diasAntes) {
      const previos = await prisma.registroVentas.findMany({ where: { corteId: anterior.id } });
      const previoPorTienda = new Map(previos.map((registro) => [registro.tiendaId, registro]));

      for (const registro of ventas) {
        const previo = previoPorTienda.get(registro.tiendaId);
        if (!registro.ventasReal || !previo?.ventasReal) continue;

        const ahora = registro.ventasReal / diasAhora;
        const antes = previo.ventasReal / diasAntes;
        const variacion = ((ahora - antes) / antes) * 100;

        if (Math.abs(variacion) > umbrales.SALTO_MAX_PCT) {
          const nombre = nombrePorTienda.get(registro.tiendaId) ?? "Tienda";
          alertas.push({
            tipo: "SALTO_IMPOSIBLE",
            severidad: "MEDIA",
            tiendaId: registro.tiendaId,
            indicador: "ventas",
            valorObservado: Number(variacion.toFixed(1)),
            valorEsperado: umbrales.SALTO_MAX_PCT,
            mensaje: `${nombre} varía ${variacion.toFixed(1)} % en venta por día contra ${anterior.nombre}. Verificar el dato antes de leerlo como tendencia.`,
          });
        }
      }
    }
  }

  alertas.push(...revisarPlantilla(plantilla, nombrePorTienda, umbrales));

  return alertas;
}

type RegistroConArea = {
  tiendaId: string;
  horasProgramadas: number | null;
  horasTrabajadas: number | null;
  horasAusentismo: number | null;
  horasExtra: number | null;
  ventas: number | null;
  unidades: number | null;
  transacciones: number | null;
  plantillaMeta: number | null;
  plantillaActiva: number | null;
  area: { nombre: string; kpi: string; estandar: number | null };
};

/**
 * Revisa la captura de plantilla. Dos cosas rompen la comparación entre tiendas y por eso se
 * marcan: horas que no cuadran con su propia aritmética —el denominador de todos los KPI— y un
 * índice fuera de escala, que casi nunca es un área excepcional sino un estándar mal puesto o
 * un volumen capturado en la columna equivocada.
 */
export function revisarPlantilla(
  registros: RegistroConArea[],
  nombrePorTienda: Map<string, string>,
  umbrales: Record<string, number>,
): AlertaDetectada[] {
  const alertas: AlertaDetectada[] = [];

  for (const registro of registros) {
    const nombre = nombrePorTienda.get(registro.tiendaId) ?? "Tienda";
    const { horasProgramadas: programadas, horasTrabajadas: trabajadas } = registro;
    const ausencia = registro.horasAusentismo ?? 0;

    // Programadas − ausentismo debería dar las trabajadas. Las horas extra se cuentan aparte
    // porque el Excel de origen no dice si van dentro de las programadas o encima de ellas,
    // y de esa lectura depende un 2 % del denominador de cada KPI.
    if (
      typeof programadas === "number" &&
      typeof trabajadas === "number" &&
      programadas > 0
    ) {
      const esperadas = programadas - ausencia;
      const desvio = Math.abs(trabajadas - esperadas);
      if ((desvio / programadas) * 100 > umbrales.TOLERANCIA_HORAS_PCT) {
        alertas.push({
          tipo: "HORAS_DESCUADRADAS",
          severidad: "MEDIA",
          tiendaId: registro.tiendaId,
          indicador: registro.area.nombre,
          valorObservado: trabajadas,
          valorEsperado: esperadas,
          mensaje: `${nombre} · ${registro.area.nombre}: ${trabajadas} horas trabajadas frente a ${esperadas} que salen de programadas menos ausentismo. Cuadrar antes de comparar productividad, porque esas horas son el divisor de todos los KPI del área.`,
        });
      }
    }

    const estandar = registro.area.estandar;
    if (!estandar || !trabajadas) continue;

    const volumen =
      registro.area.kpi === "SPLH"
        ? registro.ventas
        : registro.area.kpi === "UPLH"
          ? registro.unidades
          : registro.area.kpi === "TPLH"
            ? registro.transacciones
            : null;
    if (typeof volumen !== "number" || volumen <= 0) continue;

    const indice = volumen / trabajadas / estandar;
    if (indice > umbrales.INDICE_MAX) {
      alertas.push({
        tipo: "ESTANDAR_DESCALIBRADO",
        severidad: "BAJA",
        tiendaId: registro.tiendaId,
        indicador: registro.area.nombre,
        valorObservado: Number((indice * 100).toFixed(0)),
        valorEsperado: Number((umbrales.INDICE_MAX * 100).toFixed(0)),
        mensaje: `${nombre} · ${registro.area.nombre} rinde ${(indice * 100).toFixed(0)} % del estándar. A esa distancia lo probable no es un área excepcional sino un estándar mal calibrado o un volumen capturado en otra columna: revisar antes de tomarlo como referencia.`,
      });
    }
  }

  return alertas;
}

/** Compara un subtotal traído de la fuente contra la suma calculada de sus tiendas. */
export function revisarSubtotal(
  etiqueta: string,
  subtotalExterno: number,
  sumaCalculada: number,
  tolerancia: number,
): AlertaDetectada | null {
  const diferencia = subtotalExterno - sumaCalculada;
  if (Math.abs(diferencia) <= tolerancia) return null;
  return {
    tipo: "SUBTOTAL_DESCUADRADO",
    severidad: "ALTA",
    tiendaId: null,
    indicador: etiqueta,
    valorObservado: subtotalExterno,
    valorEsperado: sumaCalculada,
    mensaje: `El subtotal de ${etiqueta} en la fuente no coincide con la suma de sus tiendas: diferencia de ${diferencia.toFixed(2)}.`,
  };
}

function firma(alerta: { tipo: string; tiendaId: string | null; indicador: string | null }) {
  return `${alerta.tipo}|${alerta.tiendaId ?? ""}|${alerta.indicador ?? ""}`;
}

/**
 * Guarda las alertas nuevas del corte. Respeta lo ya decidido: si una alerta con la misma firma
 * fue revisada o descartada, no se vuelve a levantar.
 */
export async function sincronizarAlertas(corteId: string) {
  const [detectadas, existentes] = await Promise.all([
    detectarAlertas(corteId),
    prisma.alerta.findMany({ where: { corteId } }),
  ]);

  const conocidas = new Set(existentes.map(firma));
  const nuevas = detectadas.filter((alerta) => !conocidas.has(firma(alerta)));

  if (nuevas.length) {
    await prisma.alerta.createMany({
      data: nuevas.map((alerta) => ({ ...alerta, corteId })),
    });
  }

  return { creadas: nuevas.length, detectadas: detectadas.length };
}
