import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { GraficoEvolucion } from "@/components/graficos/GraficoEvolucion";
import { GraficoRango } from "@/components/graficos/GraficoRango";
import {
  cargarPlantilla,
  cargarTiendas,
  evolucionPlantilla,
  listarCortes,
  resolverCorte,
} from "@/lib/consultas";
import {
  ETIQUETA_EFICIENCIA,
  ETIQUETA_KPI_PLANTILLA,
  UNIDAD_KPI_PLANTILLA,
  type EstadoEficiencia,
} from "@/lib/dominio";
import { moneda, numero, porcentaje } from "@/lib/formato";
import { costoDeLaHolgura, holguraDeHoras, type FilaPlantilla } from "@/lib/plantilla";

export const metadata = { title: "Eficiencia de la plantilla" };

const TONO: Record<EstadoEficiencia, string> = {
  OPTIMO: "bg-exito-tenue text-exito",
  DENTRO_DEL_RANGO: "bg-exito-tenue text-exito",
  ACEPTABLE: "bg-atencion-tenue text-atencion",
  BAJO_ESTANDAR: "bg-alerta-tenue text-alerta",
  SIN_DATOS: "bg-superficie-3 text-texto-3",
};

/** Formatea el KPI con la unidad que le corresponde: $/hora no se lee igual que trans/hora. */
function valorKpi(fila: FilaPlantilla) {
  if (fila.kpiReal === null) return "—";
  if (fila.kpi === "SPLH") return moneda(fila.kpiReal, fila.kpiReal < 100);
  if (fila.kpi === "COBERTURA") return porcentaje(fila.kpiReal);
  return numero(fila.kpiReal, 1);
}

function rangoTexto(fila: FilaPlantilla) {
  if (fila.estandarMin === null || fila.estandarMax === null) {
    return fila.estandar === null ? "por calibrar" : numero(fila.estandar, 0);
  }
  return `${numero(fila.estandarMin, 0)} – ${numero(fila.estandarMax, 0)}`;
}

export default async function PlantillaPage({ searchParams }: PageProps<"/plantilla">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const tiendaId = typeof parametros.tienda === "string" ? parametros.tienda : "";

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const [{ porTienda, resumen }, todasLasTiendas] = await Promise.all([
    cargarPlantilla(corte.id, tiendaId || undefined),
    cargarTiendas(),
  ]);

  const encabezado = (
    <Encabezado corte={corte} cortes={cortes} tiendas={todasLasTiendas} tiendaId={tiendaId} />
  );

  if (resumen.areasConDatos === 0) {
    return (
      <div className="space-y-6">
        {encabezado}
        <EstadoVacio mensaje="Este corte todavía no tiene horas ni plantilla cargadas. Captúralas para ver el índice de eficiencia." />
      </div>
    );
  }

  const tiendaActual = todasLasTiendas.find((tienda) => tienda.id === tiendaId);
  const holgura = holguraDeHoras(resumen);
  const costoHolgura = costoDeLaHolgura(resumen);
  const evolucion = tiendaId ? [] : await evolucionPlantilla();

  const barras = resumen.filas
    .filter((fila) => fila.indice !== null)
    .map((fila) => ({
      etiqueta: fila.area,
      indice: (fila.indice as number) * 100,
      rangoMin:
        fila.estandarMin !== null && fila.estandar ? (fila.estandarMin / fila.estandar) * 100 : null,
      rangoMax:
        fila.estandarMax !== null && fila.estandar ? (fila.estandarMax / fila.estandar) * 100 : null,
      dentroDelRango: fila.estado === "OPTIMO" || fila.estado === "DENTRO_DEL_RANGO",
    }));

  return (
    <div className="space-y-6">
      {encabezado}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Índice de eficiencia"
          valor={resumen.indice === null ? "—" : porcentaje(resumen.indice * 100)}
          detalle={`Ponderado por horas · ${resumen.areasMedidas} áreas medibles`}
        />
        <TarjetaKpi
          etiqueta="Cobertura de plantilla"
          valor={porcentaje(resumen.cobertura)}
          detalle={`${numero(resumen.plantillaActiva)} de ${numero(resumen.plantillaMeta)} personas`}
        />
        <TarjetaKpi
          etiqueta="Ausentismo"
          valor={porcentaje(resumen.ausentismo)}
          detalle={`${numero(resumen.horasAusentismo)} h sobre ${numero(resumen.horasProgramadas)} programadas`}
        />
        <TarjetaKpi
          etiqueta="Costo de nómina sobre ventas"
          valor={porcentaje(resumen.costoSobreVentas)}
          detalle={`${moneda(resumen.costoNomina)} de nómina`}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Horas trabajadas"
          valor={numero(resumen.horasTrabajadas)}
          detalle={`${porcentaje(resumen.porcentajeHorasExtra)} en horas extra`}
        />
        <TarjetaKpi
          etiqueta="Horas ganadas al estándar"
          valor={numero(resumen.horasGanadas)}
          detalle="Lo que ese volumen debía costar"
        />
        <TarjetaKpi
          etiqueta={holgura !== null && holgura > 0 ? "Horas por encima del estándar" : "Horas ahorradas"}
          valor={holgura === null ? "—" : numero(Math.abs(holgura))}
          detalle={
            costoHolgura === null
              ? "Sin costo de nómina cargado"
              : `${moneda(Math.abs(costoHolgura))} al costo por hora del corte`
          }
        />
        <TarjetaKpi
          etiqueta="Áreas por debajo del estándar"
          valor={`${resumen.areasBajoEstandar} de ${resumen.areasConDatos}`}
          detalle={`${resumen.areasOptimas} en referencia o mejor`}
        />
      </section>

      <section className="tarjeta p-5">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          Cada área contra su rango de referencia
        </h2>
        <p className="mt-1 mb-4 text-sm text-texto-3">
          La banda gris es el rango que publica la industria para esa área; el punto es dónde
          quedó {tiendaActual ? tiendaActual.nombre : "la zona"}. Quedar dentro de la banda es
          cumplir, aunque no se llegue al 100 % del punto de referencia.
        </p>
        <GraficoRango barras={barras} />
      </section>

      <section className="tarjeta overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Detalle por área</h2>
          <p className="text-xs text-texto-3">
            Índice = KPI del área ÷ su estándar. El de la tienda pondera por horas trabajadas.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[960px]">
            <thead>
              <tr>
                <th className="text-left">Área</th>
                <th className="text-left">KPI</th>
                <th>Horas</th>
                <th>Cobertura</th>
                <th>KPI real</th>
                <th>Referencia</th>
                <th>Índice</th>
                <th className="text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {resumen.filas.map((fila) => (
                <tr key={fila.areaId}>
                  <td className="text-left font-medium">
                    {fila.area}
                    {fila.ventaDerivada && (
                      <span className="ml-2 text-xs font-normal text-texto-3">
                        venta de la tienda
                      </span>
                    )}
                  </td>
                  <td className="text-left text-xs text-texto-3">
                    {ETIQUETA_KPI_PLANTILLA[fila.kpi]}
                    <span className="block">{UNIDAD_KPI_PLANTILLA[fila.kpi]}</span>
                  </td>
                  <td>{numero(fila.horasTrabajadas)}</td>
                  <td>{porcentaje(fila.cobertura)}</td>
                  <td className="font-medium">{valorKpi(fila)}</td>
                  <td className="text-texto-3">{rangoTexto(fila)}</td>
                  <td className="font-medium">
                    {fila.indice === null ? "—" : porcentaje(fila.indice * 100, 0)}
                  </td>
                  <td className="text-left">
                    <span className={`chip ${TONO[fila.estado]}`}>
                      {ETIQUETA_EFICIENCIA[fila.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!tiendaId && porTienda.length > 1 && (
        <section className="tarjeta overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-base font-semibold tracking-[-0.02em]">Comparación entre tiendas</h2>
            <p className="mt-1 text-xs text-texto-3">
              Mismo método en todas: horas ganadas al estándar sobre horas trabajadas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="tabla min-w-[760px]">
              <thead>
                <tr>
                  <th className="text-left">Tienda</th>
                  <th>Índice</th>
                  <th>Cobertura</th>
                  <th>Ausentismo</th>
                  <th>Horas extra</th>
                  <th>Ventas por hora</th>
                  <th>Costo / ventas</th>
                  <th>Áreas bajas</th>
                </tr>
              </thead>
              <tbody>
                {[...porTienda]
                  .sort((a, b) => (b.resumen.indice ?? 0) - (a.resumen.indice ?? 0))
                  .map((fila) => (
                    <tr key={fila.tiendaId}>
                      <td className="text-left font-medium">
                        <Link
                          className="hover:text-acento"
                          href={`/plantilla?corte=${corte.id}&tienda=${fila.tiendaId}`}
                        >
                          {fila.tienda}
                        </Link>
                      </td>
                      <td className="font-medium">
                        {fila.resumen.indice === null
                          ? "—"
                          : porcentaje(fila.resumen.indice * 100, 0)}
                      </td>
                      <td>{porcentaje(fila.resumen.cobertura)}</td>
                      <td>{porcentaje(fila.resumen.ausentismo)}</td>
                      <td>{porcentaje(fila.resumen.porcentajeHorasExtra)}</td>
                      <td>{moneda(fila.resumen.ventasPorHora)}</td>
                      <td>{porcentaje(fila.resumen.costoSobreVentas)}</td>
                      <td>{fila.resumen.areasBajoEstandar}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {evolucion.length > 1 && (
        <section className="tarjeta p-5">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Evolución del índice</h2>
          <p className="mt-1 mb-4 text-sm text-texto-3">
            Cien por ciento es el estándar. La pregunta no es el nivel de un mes, sino si la
            plantilla gana o pierde productividad a lo largo del año.
          </p>
          <GraficoEvolucion
            puntos={evolucion.map((punto) => ({
              etiqueta: punto.etiqueta,
              meta: 100,
              real: punto.indice,
            }))}
            series={{ real: "Índice de la zona", meta: "Estándar" }}
            formato={(valor) => `${Math.round(valor)} %`}
            desdeCero={false}
          />
        </section>
      )}

      <p className="text-xs text-texto-3">
        Método: horas ganadas = volumen del área ÷ su estándar; índice = horas ganadas ÷ horas
        trabajadas. Referencias de NRF, RILA, IGD, WERC e ISSA, calibrables desde Configuración.
        Las áreas sin volumen propio —limpieza y seguridad— se evalúan por cobertura y quedan
        fuera del índice.
      </p>
    </div>
  );
}

function Encabezado({
  corte,
  cortes,
  tiendas,
  tiendaId,
}: {
  corte: { id: string; nombre: string };
  cortes: { id: string; nombre: string }[];
  tiendas: { id: string; nombre: string }[];
  tiendaId: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Eficiencia de la plantilla</h1>
        <p className="text-sm text-texto-3">
          Cuánto produce cada hora de trabajo pagada, área por área.
        </p>
      </div>
      <div className="no-imprimir flex items-center gap-3">
        <SelectorCorte cortes={cortes} actual={corte.id} />
        <Link className="boton-secundario" href={`/plantilla/capturar?corte=${corte.id}`}>
          Capturar
        </Link>
      </div>

      <nav className="no-imprimir flex w-full flex-wrap gap-1.5">
        <Link
          href={`/plantilla?corte=${corte.id}`}
          className={`chip ${tiendaId ? "bg-superficie-3 text-texto-2" : "bg-acento-tenue text-acento"}`}
        >
          Toda la zona
        </Link>
        {tiendas.map((tienda) => (
          <Link
            key={tienda.id}
            href={`/plantilla?corte=${corte.id}&tienda=${tienda.id}`}
            className={`chip ${
              tiendaId === tienda.id ? "bg-acento-tenue text-acento" : "bg-superficie-3 text-texto-2"
            }`}
          >
            {tienda.nombre}
          </Link>
        ))}
      </nav>
    </header>
  );
}
