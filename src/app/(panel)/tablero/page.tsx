import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { RitmoDiario } from "@/components/RitmoDiario";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TablaZonas, type ColumnaTabla } from "@/components/TablaZonas";
import { TablaEvolucion } from "@/components/TablaEvolucion";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { Medidor } from "@/components/graficos/Medidor";
import { aporte, proyectarCierre, type FilaCalculada, type FilaTienda } from "@/lib/calculos";
import {
  comparativaMensual,
  cargarSerieDiaria,
  cargarTablero,
  listarCortes,
  resolverCorte,
} from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { asp } from "@/lib/documentos/indicadores";
import { ETIQUETA_ESTADO_CORTE, type EstadoCorte } from "@/lib/dominio";
import { resumirRitmo } from "@/lib/ritmo";
import {
  CLASES_TONO,
  fechaCorta,
  moneda,
  numero,
  porcentaje,
  tonoCumplimiento,
} from "@/lib/formato";

const VISTAS = [
  { clave: "resumen", etiqueta: "Resumen" },
  { clave: "ritmo", etiqueta: "Ritmo diario" },
  { clave: "evolucion", etiqueta: "Evolución mensual" },
  { clave: "proyeccion", etiqueta: "Proyección de cierre" },
  { clave: "aportes", etiqueta: "Consolidado de aportes" },
] as const;

const INDICADORES_EVOLUCION = [
  { clave: "ventas", etiqueta: "Venta" },
  { clave: "ticket", etiqueta: "Ticket promedio" },
  { clave: "margen", etiqueta: "Margen bruto" },
  { clave: "logro", etiqueta: "Logro contra meta" },
] as const;

type IndicadorEvolucion = (typeof INDICADORES_EVOLUCION)[number]["clave"];

function Cumplimiento({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-texto-3">—</span>;
  return (
    <span className={`chip ${CLASES_TONO[tonoCumplimiento(valor)]}`}>{porcentaje(valor)}</span>
  );
}

export default async function TableroPage({ searchParams }: PageProps<"/tablero">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const vista = typeof parametros.vista === "string" ? parametros.vista : "resumen";

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);

  if (!corte) {
    return (
      <EstadoVacio mensaje="Todavía no hay ningún corte cargado. Crea uno para empezar a trabajar." />
    );
  }

  const indicadorPedido =
    typeof parametros.indicador === "string" ? parametros.indicador : "ventas";
  const indicador = (INDICADORES_EVOLUCION.some((opcion) => opcion.clave === indicadorPedido)
    ? indicadorPedido
    : "ventas") as IndicadorEvolucion;

  const [tablero, benchmarks, comparativa, serie] = await Promise.all([
    cargarTablero(corte.id),
    prisma.benchmark.findMany(),
    vista === "evolucion" ? comparativaMensual(6) : Promise.resolve(null),
    vista === "ritmo" ? cargarSerieDiaria(30) : Promise.resolve([]),
  ]);
  const ritmo = resumirRitmo(serie);
  const { total } = tablero;

  // La zona propia es la que se gestiona; el total de cadena es escala, no desempeño.
  const zonaPropia = tablero.zonas.find((zona) => zona.detallada) ?? null;
  const referencia = (clave: string) =>
    benchmarks.find((benchmark) => benchmark.clave === clave)?.valor ?? null;

  const medidores = zonaPropia
    ? [
        { etiqueta: "Margen bruto", valor: zonaPropia.subtotal.margenBrutoReal, referencia: referencia("MB_PCT"), sufijo: " %", maximo: 35 },
        { etiqueta: "Ticket promedio", valor: zonaPropia.subtotal.ticketPromedio, referencia: referencia("RPT"), sufijo: "", maximo: 60 },
        { etiqueta: "Unidades por ticket", valor: zonaPropia.subtotal.upt, referencia: referencia("UPT"), sufijo: "", maximo: 5 },
        { etiqueta: "Precio medio", valor: asp(zonaPropia.subtotal), referencia: referencia("ASP"), sufijo: "", maximo: 25 },
      ].filter((medidor) => medidor.referencia !== null)
    : [];

  const columnas = construirColumnas(vista, total, corte);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Tablero de Control de Ventas</h1>
          <p className="mt-1 text-sm text-texto-2">
            {corte.nombre} · {fechaCorta(corte.fechaInicio)} al {fechaCorta(corte.fechaFin)} ·{" "}
            {ETIQUETA_ESTADO_CORTE[corte.estado as EstadoCorte] ?? corte.estado}
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Ventas"
          valor={moneda(total.ventasReal)}
          cumplimiento={total.cumplimientoVentas}
          detalle={`Meta ${moneda(total.ventasMeta)}`}
        />
        <TarjetaKpi
          etiqueta="Transacciones"
          valor={numero(total.transaccionesReal)}
          cumplimiento={total.cumplimientoTransacciones}
          detalle={`UPT ${numero(total.upt, 2)}`}
        />
        <TarjetaKpi
          etiqueta="Ticket promedio"
          valor={moneda(total.ticketPromedio, true)}
          detalle={`Meta ${moneda(total.ticketMeta, true)}`}
        />
        <TarjetaKpi
          etiqueta="Margen bruto"
          valor={porcentaje(total.margenBrutoReal)}
          detalle={`${moneda(total.margenBrutoUsd)} · meta ${porcentaje(total.margenBrutoMeta)}`}
        />
      </section>

      {medidores.length > 0 && zonaPropia && (
        <section className="tarjeta p-4">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{zonaPropia.zona} contra la referencia</h2>
            <span className="text-xs text-texto-3">
              La marca del arco es el benchmark cargado en Configuración
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {medidores.map((medidor) => (
              <Medidor
                key={medidor.etiqueta}
                valor={medidor.valor}
                referencia={medidor.referencia}
                maximo={medidor.maximo}
                sufijo={medidor.sufijo}
                etiqueta={medidor.etiqueta}
              />
            ))}
          </div>
        </section>
      )}

      <Pestanas
        pestanas={VISTAS.map((opcion) => ({
          href: `/tablero?corte=${corte.id}&vista=${opcion.clave}`,
          etiqueta: opcion.etiqueta,
          activa: vista === opcion.clave,
        }))}
      />

      {vista === "ritmo" ? (
        ritmo.dias.length ? (
          <RitmoDiario ritmo={ritmo} />
        ) : (
          <EstadoVacio mensaje="Todavía no hay serie diaria. La carga el Resumen Ejecutivo de la cadena, que trae los comparativos de siete días." />
        )
      ) : vista === "evolucion" ? (
        comparativa && comparativa.tiendas.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="no-imprimir flex flex-wrap gap-1.5">
                {INDICADORES_EVOLUCION.map((opcion) => (
                  <Link
                    key={opcion.clave}
                    href={`/tablero?corte=${corte.id}&vista=evolucion&indicador=${opcion.clave}`}
                    className={`chip ${
                      indicador === opcion.clave
                        ? "bg-acento-tenue text-acento"
                        : "bg-superficie-3 text-texto-2"
                    }`}
                  >
                    {opcion.etiqueta}
                  </Link>
                ))}
              </nav>
              <span className="text-xs text-texto-3">
                Últimos {comparativa.etiquetas.length} cierres de mes · la variación compara
                contra el primer mes con datos de cada tienda
              </span>
            </div>

            <TablaEvolucion comparativa={comparativa} indicador={indicador} />

            <p className="text-xs text-texto-3">
              Solo entran cierres de mes. Un acumulado de mitad de mes en esta tabla mediría
              días y no desempeño, y una tienda que abrió a mitad del período va con guion en
              los meses en que todavía no operaba: un cero diría que no vendió nada.
            </p>
          </div>
        ) : (
          <EstadoVacio mensaje="Hacen falta al menos dos cierres de mes cargados para comparar la evolución." />
        )
      ) : (
        <TablaZonas
          zonas={tablero.zonas.map((zona) => ({
            ...zona,
            nota: zona.detallada ? undefined : "solo total de zona",
          }))}
          total={total}
          columnas={columnas}
        />
      )}
    </div>
  );
}

function construirColumnas(
  vista: string,
  total: FilaCalculada,
  corte: { diasTranscurridos: number | null; diasDelMes: number | null },
): ColumnaTabla<FilaTienda, FilaCalculada>[] {
  if (vista === "proyeccion") {
    const proyeccion = (fila: FilaCalculada) =>
      proyectarCierre(fila.ventasReal, corte.diasTranscurridos, corte.diasDelMes);
    const brecha = (fila: FilaCalculada) => {
      const estimado = proyeccion(fila);
      return estimado !== null && fila.ventasMeta !== null ? estimado - fila.ventasMeta : null;
    };

    return [
      { titulo: "Venta acumulada", numerica: true, celda: (f) => moneda(f.ventasReal), resumen: (r) => moneda(r.ventasReal) },
      { titulo: "Meta del mes", numerica: true, celda: (f) => moneda(f.ventasMeta), resumen: (r) => moneda(r.ventasMeta) },
      { titulo: "Proyección", numerica: true, celda: (f) => moneda(proyeccion(f)), resumen: (r) => moneda(proyeccion(r)) },
      {
        titulo: "vs Meta",
        numerica: true,
        celda: (f) => <Diferencia valor={brecha(f)} />,
        resumen: (r) => <Diferencia valor={brecha(r)} />,
      },
      {
        titulo: "Cierre estimado",
        numerica: true,
        celda: (f) => <Cumplimiento valor={cumplimientoProyectado(f, proyeccion(f))} />,
        resumen: (r) => <Cumplimiento valor={cumplimientoProyectado(r, proyeccion(r))} />,
      },
    ];
  }

  if (vista === "aportes") {
    return [
      { titulo: "Ventas", numerica: true, celda: (f) => moneda(f.ventasReal), resumen: (r) => moneda(r.ventasReal) },
      {
        titulo: "Aporte ventas",
        numerica: true,
        celda: (f) => porcentaje(aporte(f.ventasReal, total.ventasReal)),
        resumen: (r) => porcentaje(aporte(r.ventasReal, total.ventasReal)),
      },
      { titulo: "Unidades", numerica: true, celda: (f) => numero(f.unidadesReal), resumen: (r) => numero(r.unidadesReal) },
      {
        titulo: "Aporte unidades",
        numerica: true,
        celda: (f) => porcentaje(aporte(f.unidadesReal, total.unidadesReal)),
        resumen: (r) => porcentaje(aporte(r.unidadesReal, total.unidadesReal)),
      },
      { titulo: "Margen $", numerica: true, celda: (f) => moneda(f.margenBrutoUsd), resumen: (r) => moneda(r.margenBrutoUsd) },
      {
        titulo: "Aporte margen",
        numerica: true,
        celda: (f) => porcentaje(aporte(f.margenBrutoUsd, total.margenBrutoUsd)),
        resumen: (r) => porcentaje(aporte(r.margenBrutoUsd, total.margenBrutoUsd)),
      },
    ];
  }

  return [
    { titulo: "Meta", numerica: true, celda: (f) => moneda(f.ventasMeta), resumen: (r) => moneda(r.ventasMeta) },
    { titulo: "Ventas", numerica: true, celda: (f) => moneda(f.ventasReal), resumen: (r) => moneda(r.ventasReal) },
    {
      titulo: "Cumpl.",
      numerica: true,
      celda: (f) => <Cumplimiento valor={f.cumplimientoVentas} />,
      resumen: (r) => <Cumplimiento valor={r.cumplimientoVentas} />,
    },
    {
      titulo: "Brecha",
      numerica: true,
      celda: (f) => <Diferencia valor={f.brechaVentas} />,
      resumen: (r) => <Diferencia valor={r.brechaVentas} />,
    },
    { titulo: "Unidades", numerica: true, celda: (f) => numero(f.unidadesReal), resumen: (r) => numero(r.unidadesReal) },
    { titulo: "Transac.", numerica: true, celda: (f) => numero(f.transaccionesReal), resumen: (r) => numero(r.transaccionesReal) },
    { titulo: "Ticket", numerica: true, celda: (f) => moneda(f.ticketPromedio, true), resumen: (r) => moneda(r.ticketPromedio, true) },
    { titulo: "UPT", numerica: true, celda: (f) => numero(f.upt, 2), resumen: (r) => numero(r.upt, 2) },
    { titulo: "%MB", numerica: true, celda: (f) => porcentaje(f.margenBrutoReal), resumen: (r) => porcentaje(r.margenBrutoReal) },
  ];
}

function cumplimientoProyectado(fila: FilaCalculada, proyeccion: number | null) {
  if (proyeccion === null || fila.ventasMeta === null || fila.ventasMeta === 0) return null;
  return (proyeccion / fila.ventasMeta) * 100;
}

function Diferencia({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-texto-3">—</span>;
  const tono = valor >= 0 ? "text-exito" : "text-alerta";
  return (
    <span className={tono}>
      {valor > 0 ? "+" : ""}
      {moneda(valor)}
    </span>
  );
}
