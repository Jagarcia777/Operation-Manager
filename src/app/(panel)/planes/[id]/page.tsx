import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ESTADOS_PLAN, ETIQUETA_ALCANCE_PLAN, UNIDADES_META, type AlcancePlan } from "@/lib/dominio";
import { moneda, numero } from "@/lib/formato";
import { agregarHito, agregarMeta, borrarPlan, cambiarEstadoHito, cambiarEstadoPlan } from "../acciones";

const MESES = [1, 2, 3];

const TONO_HITO: Record<string, string> = {
  PENDIENTE: "bg-superficie-3 text-texto-2",
  EN_CURSO: "bg-acento-tenue text-acento",
  COMPLETADO: "bg-exito-tenue text-exito",
};

function valorConUnidad(valor: number | null, unidad: string) {
  if (valor === null) return "—";
  if (unidad === "USD") return moneda(valor);
  if (unidad === "PORCENTAJE") return `${numero(valor, 1)} %`;
  return numero(valor);
}

export default async function PlanPage({ params }: PageProps<"/planes/[id]">) {
  const { id } = await params;
  const plan = await prisma.planAccion.findUnique({
    where: { id },
    include: {
      zona: true,
      tienda: true,
      corte: true,
      metas: true,
      hitos: { orderBy: { mes: "asc" } },
    },
  });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/planes" className="no-imprimir text-xs text-acento hover:underline">
            ← Planes de acción
          </Link>
          <h1 className="mt-1 text-2xl">{plan.titulo}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {ETIQUETA_ALCANCE_PLAN[plan.alcance as AlcancePlan]} ·{" "}
            {plan.tienda?.nombre ?? plan.zona?.nombre ?? "Toda la cadena"}
            {plan.corte ? ` · ${plan.corte.nombre}` : ""}
          </p>
        </div>
        <div className="no-imprimir flex items-end gap-2">
          <form action={cambiarEstadoPlan} className="flex items-end gap-2">
            <input type="hidden" name="id" value={plan.id} />
            <select name="estado" defaultValue={plan.estado} className="campo w-36">
              {ESTADOS_PLAN.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            <button type="submit" className="boton boton-secundario">
              Aplicar
            </button>
          </form>
          <form action={borrarPlan}>
            <input type="hidden" name="id" value={plan.id} />
            <button type="submit" className="boton boton-secundario">
              Eliminar
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="tarjeta p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold">Diagnóstico</h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-texto-2">
            {plan.diagnostico || "Sin diagnóstico registrado."}
          </p>
        </div>
        <div className="tarjeta p-4">
          <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">
            Oportunidad en juego
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">
            {moneda(plan.oportunidadUsd)}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Metas cuantificadas</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="text-left">Indicador</th>
                <th className="text-right">Hoy</th>
                <th className="text-right">Objetivo</th>
                <th className="text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {plan.metas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-texto-3">
                    Sin metas todavía. Un plan sin meta cuantificada no se puede evaluar.
                  </td>
                </tr>
              )}
              {plan.metas.map((meta) => (
                <tr key={meta.id}>
                  <td>{meta.indicador}</td>
                  <td className="cifra">{valorConUnidad(meta.valorActual, meta.unidad)}</td>
                  <td className="cifra">{valorConUnidad(meta.valorObjetivo, meta.unidad)}</td>
                  <td className="cifra">
                    {meta.valorActual !== null && meta.valorObjetivo !== null
                      ? valorConUnidad(meta.valorObjetivo - meta.valorActual, meta.unidad)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={agregarMeta} className="no-imprimir tarjeta flex flex-wrap items-end gap-2 p-3">
          <input type="hidden" name="planId" value={plan.id} />
          <label className="text-xs text-texto-3">
            Indicador
            <input name="indicador" required className="campo mt-1 w-56" placeholder="Ticket promedio" />
          </label>
          <label className="text-xs text-texto-3">
            Hoy
            <input name="valorActual" type="number" step="any" className="campo mt-1 w-28" />
          </label>
          <label className="text-xs text-texto-3">
            Objetivo
            <input name="valorObjetivo" type="number" step="any" className="campo mt-1 w-28" />
          </label>
          <label className="text-xs text-texto-3">
            Unidad
            <select name="unidad" className="campo mt-1 w-32">
              {UNIDADES_META.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="boton boton-secundario">
            Agregar meta
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Cronograma a tres meses</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MESES.map((mes) => (
            <div key={mes} className="tarjeta p-4">
              <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">Mes {mes}</p>
              <ul className="mt-3 space-y-2.5">
                {plan.hitos
                  .filter((hito) => hito.mes === mes)
                  .map((hito) => (
                    <li key={hito.id} className="border-b border-borde-suave pb-2.5 last:border-0">
                      <p className="text-sm">{hito.descripcion}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`chip ${TONO_HITO[hito.estado]}`}>{hito.estado}</span>
                        {hito.responsable && (
                          <span className="text-xs text-texto-3">{hito.responsable}</span>
                        )}
                      </div>
                      <form action={cambiarEstadoHito} className="no-imprimir mt-1.5 flex gap-1.5">
                        <input type="hidden" name="id" value={hito.id} />
                        <input type="hidden" name="planId" value={plan.id} />
                        <select name="estado" defaultValue={hito.estado} className="campo w-32 py-1 text-xs">
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_CURSO">En curso</option>
                          <option value="COMPLETADO">Completado</option>
                        </select>
                        <button type="submit" className="boton boton-secundario px-2 py-1 text-xs">
                          Ok
                        </button>
                      </form>
                    </li>
                  ))}
                {plan.hitos.filter((hito) => hito.mes === mes).length === 0 && (
                  <li className="text-sm text-texto-3">Sin hitos.</li>
                )}
              </ul>

              <form action={agregarHito} className="no-imprimir mt-3 space-y-2 border-t border-borde-suave pt-3">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="mes" value={mes} />
                <input name="descripcion" required placeholder="Nuevo hito" className="campo text-sm" />
                <input name="responsable" placeholder="Responsable" className="campo text-sm" />
                <button type="submit" className="boton boton-secundario w-full">
                  Agregar
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
