import { GraficoEvolucion } from "@/components/graficos/GraficoEvolucion";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { moneda, variacion } from "@/lib/formato";
import type { DiaComparado, ResumenRitmo } from "@/lib/ritmo";

/**
 * Ritmo diario de la cadena. El informe publica dos cuadros de siete días; aquí son una sola
 * serie con sus dos lecturas, y el titular no es el día sino la semana: un sábado siempre
 * vende más que un martes, así que comparar días sueltos mide el calendario y no la operación.
 */
export function RitmoDiario({ ritmo }: { ritmo: ResumenRitmo }) {
  if (!ritmo.dias.length) return null;

  const puntos = [...ritmo.dias]
    .reverse()
    .map((dia) => ({
      etiqueta: `${dia.diaSemana.slice(0, 3)} ${dia.fecha.getUTCDate()}`,
      real: dia.ventas,
      meta: dia.semanaAnterior,
    }));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Promedio diario de la semana"
          valor={moneda(ritmo.promedio)}
          detalle="Últimos 7 días"
        />
        <TarjetaKpi
          etiqueta="Contra la semana anterior"
          valor={ritmo.variacionSemanal === null ? "—" : variacion(ritmo.variacionSemanal)}
          detalle={
            ritmo.promedioSemanaAnterior === null
              ? "Falta una semana completa para comparar"
              : `${moneda(ritmo.promedioSemanaAnterior)} de promedio`
          }
        />
        <TarjetaKpi
          etiqueta="Mejor día"
          valor={moneda(ritmo.mejor?.ventas)}
          detalle={ritmo.mejor ? `${ritmo.mejor.diaSemana} ${ritmo.mejor.fecha.getUTCDate()}` : ""}
        />
        <TarjetaKpi
          etiqueta="Día más flojo"
          valor={moneda(ritmo.peor?.ventas)}
          detalle={ritmo.peor ? `${ritmo.peor.diaSemana} ${ritmo.peor.fecha.getUTCDate()}` : ""}
        />
      </section>

      <section className="tarjeta p-5">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          Cada día contra el mismo día de la semana pasada
        </h2>
        <p className="mt-1 mb-4 text-sm text-texto-3">
          Comparar sábado con sábado y martes con martes es lo único que separa el movimiento
          real del calendario.
        </p>
        <GraficoEvolucion
          puntos={puntos}
          series={{ real: "Esta semana", meta: "Semana anterior" }}
          desdeCero={false}
        />
      </section>

      <section className="tarjeta overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 text-base font-semibold tracking-[-0.02em]">
          Detalle de los últimos siete días
        </h2>
        <div className="overflow-x-auto">
          <table className="tabla min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left">Día</th>
                <th>Venta</th>
                <th>Día anterior</th>
                <th>Variación</th>
                <th>Semana anterior</th>
                <th>Variación</th>
              </tr>
            </thead>
            <tbody>
              {ritmo.dias.map((dia) => (
                <tr key={dia.fecha.toISOString()}>
                  <td className="text-left">
                    <span className="font-medium">{dia.diaSemana}</span>
                    <span className="ml-2 text-texto-3">
                      {String(dia.fecha.getUTCDate()).padStart(2, "0")}/
                      {String(dia.fecha.getUTCMonth() + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="font-medium">{moneda(dia.ventas)}</td>
                  <td className="text-texto-3">{moneda(dia.anterior)}</td>
                  <Variacion valor={dia.variacionAnterior} />
                  <td className="text-texto-3">{moneda(dia.semanaAnterior)}</td>
                  <Variacion valor={dia.variacionSemanal} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Variacion({ valor }: { valor: number | null }) {
  if (valor === null) return <td className="text-texto-3">—</td>;
  return (
    <td className={valor >= 0 ? "text-exito" : "text-alerta"}>
      {valor >= 0 ? "▲" : "▼"} {variacion(valor)}
    </td>
  );
}

export type { DiaComparado };
