import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { cargarTiendas } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import {
  ETIQUETA_ESTADO_CORRECCION,
  ETIQUETA_FRECUENCIA,
  type EstadoCorreccion,
  type FrecuenciaChecklist,
} from "@/lib/dominio";
import { fechaCorta } from "@/lib/formato";
import { iniciarInspeccion } from "./acciones";

const AVISOS: Record<string, string> = {
  faltan: "Elige el checklist y la tienda antes de empezar.",
  sinpuntos: "Ese checklist no tiene puntos cargados todavía. Agrégalos en Configuración.",
};

export default async function InspeccionesPage({ searchParams }: PageProps<"/inspecciones">) {
  const parametros = await searchParams;
  const error = typeof parametros.error === "string" ? parametros.error : null;

  const [checklists, tiendas, inspecciones, abiertas] = await Promise.all([
    prisma.checklist.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
      include: { _count: { select: { puntos: true } } },
    }),
    cargarTiendas(),
    prisma.inspeccion.findMany({
      orderBy: { fecha: "desc" },
      take: 20,
      include: {
        checklist: { select: { nombre: true } },
        tienda: { select: { nombre: true } },
        resultados: { select: { cumple: true, estado: true } },
      },
    }),
    prisma.resultadoPunto.findMany({
      where: { cumple: "NO_OK", estado: { in: ["PENDIENTE", "EN_CURSO"] } },
      orderBy: [{ fechaLimite: "asc" }],
      take: 8,
      include: {
        punto: { select: { actividad: true } },
        inspeccion: {
          select: { id: true, fecha: true, tienda: { select: { nombre: true } } },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Inspecciones</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Lo que se revisa en tienda y qué se hizo con lo que salió mal. Cada punto se marca OK o
          No OK; lo que sale No OK exige observación, corrección con responsable y fecha, y queda
          abierto hasta que alguien lo cierra.
        </p>
      </header>

      {error && AVISOS[error] && (
        <p className="tarjeta border-alerta-tenue bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {AVISOS[error]}
        </p>
      )}

      {checklists.length === 0 ? (
        <EstadoVacio mensaje="Todavía no hay checklists. Créalos en Configuración → Checklists." />
      ) : (
        <form action={iniciarInspeccion} className="tarjeta flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">
            <span className="text-texto-2">Checklist</span>
            <select name="checklistId" className="campo mt-1.5 w-60" required>
              {checklists.map((checklist) => (
                <option key={checklist.id} value={checklist.id}>
                  {checklist.nombre} · {checklist._count.puntos} puntos ·{" "}
                  {ETIQUETA_FRECUENCIA[checklist.frecuencia as FrecuenciaChecklist] ??
                    checklist.frecuencia}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-texto-2">Tienda</span>
            <select name="tiendaId" className="campo mt-1.5 w-52" required>
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-texto-2">Quién revisa</span>
            <input name="responsable" className="campo mt-1.5 w-48" placeholder="Nombre" />
          </label>
          <button type="submit" className="boton boton-primario">
            Empezar inspección
          </button>
        </form>
      )}

      {abiertas.length > 0 && (
        <section className="tarjeta p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Correcciones abiertas</h2>
            <span className="text-xs text-texto-3">Ordenadas por fecha límite</span>
          </div>
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="text-left">Actividad</th>
                  <th className="text-left">Tienda</th>
                  <th className="text-left">Corrección</th>
                  <th className="text-left">Responsable</th>
                  <th className="text-left">Límite</th>
                  <th className="text-left">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {abiertas.map((hallazgo) => {
                  const vencida =
                    hallazgo.fechaLimite !== null && hallazgo.fechaLimite < new Date();
                  return (
                    <tr key={hallazgo.id}>
                      <td>
                        <Link
                          href={`/inspecciones/${hallazgo.inspeccion.id}`}
                          className="hover:underline"
                        >
                          {hallazgo.punto.actividad}
                        </Link>
                      </td>
                      <td>{hallazgo.inspeccion.tienda.nombre}</td>
                      <td className="text-texto-2">{hallazgo.correccion ?? "—"}</td>
                      <td className="text-texto-2">{hallazgo.responsable ?? "Sin asignar"}</td>
                      <td className={vencida ? "text-alerta" : "text-texto-2"}>
                        {hallazgo.fechaLimite ? fechaCorta(hallazgo.fechaLimite) : "Sin fecha"}
                        {vencida && " · vencida"}
                      </td>
                      <td>
                        <span
                          className={`chip ${
                            hallazgo.estado === "EN_CURSO"
                              ? "bg-acento-tenue text-acento"
                              : "bg-atencion-tenue text-atencion"
                          }`}
                        >
                          {ETIQUETA_ESTADO_CORRECCION[hallazgo.estado as EstadoCorreccion] ??
                            hallazgo.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Inspecciones recientes</h2>
        {inspecciones.length === 0 ? (
          <EstadoVacio mensaje="Todavía no se ha hecho ninguna inspección." />
        ) : (
          <div className="tarjeta divide-y divide-borde-suave">
            {inspecciones.map((inspeccion) => {
              const total = inspeccion.resultados.length;
              const revisados = inspeccion.resultados.filter((r) => r.cumple !== "PENDIENTE").length;
              const fallos = inspeccion.resultados.filter((r) => r.cumple === "NO_OK").length;
              const evaluables = inspeccion.resultados.filter(
                (r) => r.cumple === "OK" || r.cumple === "NO_OK",
              ).length;
              // El cumplimiento se mide sobre lo evaluable: los "no aplica" no cuentan ni a
              // favor ni en contra, y los no revisados todavía no dicen nada.
              const cumplimiento = evaluables
                ? ((evaluables - fallos) / evaluables) * 100
                : null;

              return (
                <Link
                  key={inspeccion.id}
                  href={`/inspecciones/${inspeccion.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-superficie-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {inspeccion.tienda.nombre}
                      <span className="ml-2 font-normal text-texto-3">
                        {inspeccion.checklist.nombre}
                      </span>
                    </p>
                    <p className="text-xs text-texto-3">
                      {fechaCorta(inspeccion.fecha)}
                      {inspeccion.responsable && ` · ${inspeccion.responsable}`} · {revisados} de{" "}
                      {total} puntos revisados
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {fallos > 0 && (
                      <span className="chip bg-alerta-tenue text-alerta">
                        {fallos} {fallos === 1 ? "hallazgo" : "hallazgos"}
                      </span>
                    )}
                    {cumplimiento !== null && (
                      <span
                        className={`chip ${
                          cumplimiento >= 95
                            ? "bg-exito-tenue text-exito"
                            : cumplimiento >= 85
                              ? "bg-atencion-tenue text-atencion"
                              : "bg-alerta-tenue text-alerta"
                        }`}
                      >
                        {cumplimiento.toFixed(0)} % cumple
                      </span>
                    )}
                    <span
                      className={`chip ${
                        inspeccion.estado === "CERRADA"
                          ? "bg-superficie-3 text-texto-2"
                          : "bg-acento-tenue text-acento"
                      }`}
                    >
                      {inspeccion.estado === "CERRADA" ? "Cerrada" : "Abierta"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
