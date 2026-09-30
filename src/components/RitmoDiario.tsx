import { GraficoEvolucion } from "@/components/graficos/GraficoEvolucion";
import { TarjetaKpi } from "@/components/TarjetaKpi";
import { moneda, porcentaje, variacion } from "@/lib/formato";
import type { DiaComparado, PerfilSemanal, ResumenRitmo } from "@/lib/ritmo";

/**
 * Ritmo diario de la cadena. El informe publica dos cuadros de siete días; aquí son una sola
 * serie con sus dos lecturas, y el titular no es el día sino la semana: un sábado siempre
 * vende más que un martes, así que comparar días sueltos mide el calendario y no la operación.
 */
export function RitmoDiario({
  ritmo,
  perfil,
}: {
  ritmo: ResumenRitmo;
  perfil?: PerfilSemanal | null;
}) {
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

      {perfil && <PerfilPorDia perfil={perfil} />}
    </div>
  );
}

/**
 * Cuánto pesa cada día en una semana típica y cómo le fue la última vez contra su propio
 * promedio. La barra es el índice: 100 es el día promedio de la semana.
 */
function PerfilPorDia({ perfil }: { perfil: PerfilSemanal }) {
  const maximo = Math.max(...perfil.dias.map((dia) => dia.indiceSemana ?? 0), 100);
  const fuerte = [...perfil.dias].sort((a, b) => (b.pesoSemana ?? 0) - (a.pesoSemana ?? 0));

  return (
    <section className="tarjeta overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          Cada día en la semana típica
        </h2>
        <p className="mt-1 text-sm text-texto-3">
          Promedio de las últimas {perfil.semanas} semanas.{" "}
          {fuerte[0].diaSemana.charAt(0).toUpperCase() + fuerte[0].diaSemana.slice(1)} y{" "}
          {fuerte[1].diaSemana} concentran {porcentaje((fuerte[0].pesoSemana ?? 0) + (fuerte[1].pesoSemana ?? 0))}{" "}
          de la venta: es donde más rinde cada hora de caja y de reposición. La última columna
          dice si el día más reciente fue flojo de verdad o solo es ese día.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="tabla min-w-[720px]">
          <thead>
            <tr>
              <th className="text-left">Día</th>
              <th>Promedio</th>
              <th className="text-left">Índice (100 = día típico)</th>
              <th>Peso en la semana</th>
              <th>Último</th>
              <th>Contra su promedio</th>
            </tr>
          </thead>
          <tbody>
            {perfil.dias.map((dia) => (
              <tr key={dia.indice}>
                <td className="text-left font-medium">
                  {dia.diaSemana}
                  <span className="ml-2 text-xs font-normal text-texto-3">
                    {dia.observaciones} sem.
                  </span>
                </td>
                <td>{moneda(dia.promedio)}</td>
                <td className="text-left">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-superficie-3">
                      <div
                        className={`h-full rounded-full ${
                          (dia.indiceSemana ?? 0) >= 100 ? "bg-acento" : "bg-texto-3"
                        }`}
                        style={{ width: `${((dia.indiceSemana ?? 0) / maximo) * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums">
                      {dia.indiceSemana === null ? "—" : Math.round(dia.indiceSemana)}
                    </span>
                  </div>
                </td>
                <td>{porcentaje(dia.pesoSemana)}</td>
                <td className="text-texto-3">{moneda(dia.ultimo?.ventas)}</td>
                <Variacion valor={dia.ultimo?.variacion ?? null} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
