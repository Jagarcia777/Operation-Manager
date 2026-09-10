import { EstadoVacio } from "@/components/EstadoVacio";
import { SelectorCorte } from "@/components/SelectorCorte";
import type { AnalisisCorteTipo } from "@/lib/analisis/esquema";
import { listarCortes, resolverCorte } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { hayClaveIA } from "@/lib/extraccion/extraer";
import { fechaCorta, moneda } from "@/lib/formato";
import { generarAnalisis } from "./acciones";

const TONO_SEVERIDAD: Record<string, string> = {
  ALTA: "bg-alerta-tenue text-alerta",
  MEDIA: "bg-atencion-tenue text-atencion",
  BAJA: "bg-superficie-3 text-texto-2",
};

const ETIQUETA_PLAZO: Record<string, string> = {
  INMEDIATO: "Inmediato",
  "30_DIAS": "30 días",
  "90_DIAS": "90 días",
};

export default async function AnalisisPage({ searchParams }: PageProps<"/analisis">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="No hay cortes cargados todavía." />;

  const guardado = await prisma.analisis.findFirst({
    where: { corteId: corte.id, alcance: "CADENA" },
    orderBy: { creadoEn: "desc" },
  });

  const analisis: AnalisisCorteTipo | null = guardado
    ? (JSON.parse(guardado.contenido) as AnalisisCorteTipo)
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Análisis del corte</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Lectura del corte con criterio de dirección de operaciones: qué pasó de verdad, cuánto
            vale cerrarlo y qué hacer en tienda. Las cifras salen del tablero; aquí va el juicio.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <SelectorCorte cortes={cortes} actual={corte.id} />
          <form action={generarAnalisis}>
            <input type="hidden" name="corteId" value={corte.id} />
            <button
              type="submit"
              className="boton boton-primario no-imprimir"
              disabled={!hayClaveIA()}
            >
              {analisis ? "Volver a analizar" : "Analizar corte"}
            </button>
          </form>
        </div>
      </header>

      {!hayClaveIA() && (
        <div className="tarjeta bg-atencion-tenue px-4 py-3 text-sm text-atencion">
          Configura <code>ANTHROPIC_API_KEY</code> en <code>.env</code> para habilitar el análisis.
        </div>
      )}

      {!analisis ? (
        <EstadoVacio mensaje="Este corte todavía no tiene análisis. Genera uno para obtener diagnóstico, recomendaciones priorizadas por impacto y escenarios de cierre." />
      ) : (
        <>
          <section className="tarjeta p-5">
            <h2 className="text-sm font-semibold">Lectura general</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-texto-2">
              {analisis.lecturaGeneral.split("\n").filter(Boolean).map((parrafo, indice) => (
                <p key={indice}>{parrafo}</p>
              ))}
            </div>
            <p className="mt-4 text-xs text-texto-3">
              Generado el {fechaCorta(guardado?.creadoEn)} · {guardado?.modelo}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-texto-2">Hallazgos</h2>
            {analisis.hallazgos.map((hallazgo, indice) => (
              <article key={indice} className="tarjeta px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${TONO_SEVERIDAD[hallazgo.severidad]}`}>
                    {hallazgo.severidad}
                  </span>
                  <span className="text-sm font-semibold">{hallazgo.titulo}</span>
                  <span className="text-xs text-texto-3">{hallazgo.ambito}</span>
                </div>
                <p className="mt-2 text-sm text-texto-2">
                  <span className="font-medium text-texto">Evidencia. </span>
                  {hallazgo.evidencia}
                </p>
                <p className="mt-1 text-sm text-texto-2">
                  <span className="font-medium text-texto">Causa probable. </span>
                  {hallazgo.causaProbable}
                </p>
              </article>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-texto-2">
              Recomendaciones, ordenadas por impacto
            </h2>
            <div className="tarjeta overflow-x-auto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="text-left">Acción</th>
                    <th className="text-left">Ámbito</th>
                    <th className="text-right">Oportunidad</th>
                    <th className="text-left">Esfuerzo</th>
                    <th className="text-left">Plazo</th>
                    <th className="text-left">Cómo se mide</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.recomendaciones.map((recomendacion, indice) => (
                    <tr key={indice}>
                      <td className="max-w-xs">{recomendacion.accion}</td>
                      <td className="text-texto-2">{recomendacion.ambito}</td>
                      <td className="cifra">{moneda(recomendacion.impactoUsd)}</td>
                      <td className="text-texto-2">{recomendacion.esfuerzo}</td>
                      <td className="text-texto-2">
                        {ETIQUETA_PLAZO[recomendacion.plazo] ?? recomendacion.plazo}
                      </td>
                      <td className="max-w-xs text-texto-2">{recomendacion.comoMedirlo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="tarjeta p-4">
              <h2 className="text-sm font-semibold">Escenario de cierre</h2>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  { etiqueta: "Piso", valor: analisis.escenarioCierre.piso },
                  { etiqueta: "Esperado", valor: analisis.escenarioCierre.esperado },
                  { etiqueta: "Techo", valor: analisis.escenarioCierre.techo },
                ].map((escenario) => (
                  <div key={escenario.etiqueta}>
                    <p className="text-xs text-texto-3">{escenario.etiqueta}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums">
                      {moneda(escenario.valor)}
                    </p>
                  </div>
                ))}
              </div>
              {analisis.escenarioCierre.supuestos.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-borde-suave pt-3 text-sm text-texto-2">
                  {analisis.escenarioCierre.supuestos.map((supuesto, indice) => (
                    <li key={indice}>· {supuesto}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="tarjeta p-4">
              <h2 className="text-sm font-semibold">Lo que esta data no permite concluir</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-texto-2">
                {analisis.loQueNoSePuedeConcluir.map((punto, indice) => (
                  <li key={indice}>· {punto}</li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
