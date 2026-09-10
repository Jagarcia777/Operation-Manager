import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TablaZonas, type ColumnaTabla } from "@/components/TablaZonas";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { aporte, proyectarCierre, type FilaCalculada, type FilaTienda } from "@/lib/calculos";
import { cargarTablero, listarCortes, resolverCorte } from "@/lib/consultas";
import { ETIQUETA_ESTADO_CORTE, type EstadoCorte } from "@/lib/dominio";
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
  { clave: "proyeccion", etiqueta: "Proyección de cierre" },
  { clave: "aportes", etiqueta: "Consolidado de aportes" },
] as const;

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

  const tablero = await cargarTablero(corte.id);
  const { total } = tablero;

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

      <Pestanas
        pestanas={VISTAS.map((opcion) => ({
          href: `/tablero?corte=${corte.id}&vista=${opcion.clave}`,
          etiqueta: opcion.etiqueta,
          activa: vista === opcion.clave,
        }))}
      />

      <TablaZonas
        zonas={tablero.zonas.map((zona) => ({
          ...zona,
          nota: zona.detallada ? undefined : "solo total de zona",
        }))}
        total={total}
        columnas={columnas}
      />
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
