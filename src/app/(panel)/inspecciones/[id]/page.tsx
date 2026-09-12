import Link from "next/link";
import { notFound } from "next/navigation";
import { FilaInspeccion } from "@/components/FilaInspeccion";
import { prisma } from "@/lib/db";
import { ETIQUETA_FRECUENCIA, type FrecuenciaChecklist } from "@/lib/dominio";
import { fechaCorta } from "@/lib/formato";
import { cerrarInspeccion, eliminarInspeccion, guardarInspeccion, reabrirInspeccion } from "../acciones";

const AVISOS: Record<string, { texto: string; tono: "alerta" | "exito" }> = {
  criticos: {
    texto:
      "Hay un punto crítico marcado No OK sin corrección escrita. Eso es justo lo que no puede quedarse sin dueño: escribe qué se va a hacer y vuelve a cerrar.",
    tono: "alerta",
  },
  sinrevisar: {
    texto: "Quedan puntos sin revisar. Márcalos como OK, No OK o N/A antes de cerrar la hoja.",
    tono: "alerta",
  },
  guardado: { texto: "Cambios guardados.", tono: "exito" },
  cerrada: { texto: "Inspección cerrada.", tono: "exito" },
};

export default async function InspeccionPage({
  params,
  searchParams,
}: PageProps<"/inspecciones/[id]">) {
  const { id } = await params;
  const parametros = await searchParams;
  const aviso =
    AVISOS[
      (typeof parametros.error === "string" ? parametros.error : "") ||
        (typeof parametros.hecho === "string" ? parametros.hecho : "")
    ];

  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id },
    include: {
      checklist: true,
      tienda: { select: { nombre: true } },
      resultados: { include: { punto: true }, orderBy: { punto: { orden: "asc" } } },
    },
  });
  if (!inspeccion) notFound();

  const cerrada = inspeccion.estado === "CERRADA";
  const total = inspeccion.resultados.length;
  const fallos = inspeccion.resultados.filter((r) => r.cumple === "NO_OK").length;
  const evaluables = inspeccion.resultados.filter(
    (r) => r.cumple === "OK" || r.cumple === "NO_OK",
  ).length;
  const sinRevisar = inspeccion.resultados.filter((r) => r.cumple === "PENDIENTE").length;
  const cumplimiento = evaluables ? ((evaluables - fallos) / evaluables) * 100 : null;

  // Los puntos se agrupan por área para recorrer la tienda en orden y no saltar de la caja
  // al almacén y de vuelta.
  const areas = new Map<string, typeof inspeccion.resultados>();
  for (const resultado of inspeccion.resultados) {
    const area = resultado.punto.area ?? "General";
    areas.set(area, [...(areas.get(area) ?? []), resultado]);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-texto-3">
            <Link href="/inspecciones" className="hover:underline">
              Inspecciones
            </Link>
          </p>
          <h1 className="mt-1 text-2xl">{inspeccion.tienda.nombre}</h1>
          <p className="mt-1 text-sm text-texto-2">
            {inspeccion.checklist.nombre} ·{" "}
            {ETIQUETA_FRECUENCIA[inspeccion.checklist.frecuencia as FrecuenciaChecklist] ??
              inspeccion.checklist.frecuencia}{" "}
            · {fechaCorta(inspeccion.fecha)}
            {inspeccion.responsable && ` · revisa ${inspeccion.responsable}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`chip ${cerrada ? "bg-superficie-3 text-texto-2" : "bg-acento-tenue text-acento"}`}
          >
            {cerrada ? "Cerrada" : "Abierta"}
          </span>
          {cerrada ? (
            <form action={reabrirInspeccion}>
              <input type="hidden" name="inspeccionId" value={inspeccion.id} />
              <button type="submit" className="boton boton-secundario">
                Reabrir
              </button>
            </form>
          ) : null}
          <form action={eliminarInspeccion}>
            <input type="hidden" name="id" value={inspeccion.id} />
            <button type="submit" className="boton boton-secundario text-alerta">
              Eliminar
            </button>
          </form>
        </div>
      </header>

      {aviso && (
        <p
          className={`tarjeta px-4 py-3 text-sm ${
            aviso.tono === "alerta"
              ? "border-alerta-tenue bg-alerta-tenue text-alerta"
              : "border-exito-tenue bg-exito-tenue text-exito"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { etiqueta: "Puntos", valor: String(total), detalle: `${sinRevisar} sin revisar` },
          {
            etiqueta: "Cumplimiento",
            valor: cumplimiento === null ? "—" : `${cumplimiento.toFixed(0)} %`,
            detalle: "Sobre lo evaluable, sin contar los N/A",
          },
          {
            etiqueta: "Hallazgos",
            valor: String(fallos),
            detalle: fallos === 0 ? "Nada fuera de norma" : "Puntos marcados No OK",
          },
          {
            etiqueta: "Correcciones abiertas",
            valor: String(
              inspeccion.resultados.filter(
                (r) => r.cumple === "NO_OK" && ["PENDIENTE", "EN_CURSO"].includes(r.estado),
              ).length,
            ),
            detalle: "Sin resolver ni verificar",
          },
        ].map((dato) => (
          <div key={dato.etiqueta} className="tarjeta px-4 py-3.5">
            <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">
              {dato.etiqueta}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {dato.valor}
            </p>
            <p className="mt-1 text-xs text-texto-3">{dato.detalle}</p>
          </div>
        ))}
      </section>

      <form action={guardarInspeccion} className="space-y-5">
        <input type="hidden" name="inspeccionId" value={inspeccion.id} />

        {[...areas.entries()].map(([area, resultados]) => (
          <section key={area} className="tarjeta overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <h2 className="text-sm font-semibold">{area}</h2>
              <span className="text-xs text-texto-3">{resultados.length} puntos</span>
            </div>
            {resultados.map((resultado) => (
              <FilaInspeccion
                key={resultado.id}
                soloLectura={cerrada}
                resultado={{
                  id: resultado.id,
                  actividad: resultado.punto.actividad,
                  area: null,
                  critico: resultado.punto.critico,
                  cumple: resultado.cumple,
                  observacion: resultado.observacion,
                  correccion: resultado.correccion,
                  responsable: resultado.responsable,
                  fechaLimite: resultado.fechaLimite
                    ? resultado.fechaLimite.toISOString().slice(0, 10)
                    : "",
                  estado: resultado.estado,
                }}
              />
            ))}
          </section>
        ))}

        <div className="tarjeta space-y-3 p-4">
          <label className="block text-sm">
            <span className="text-texto-2">Nota de la visita</span>
            <textarea
              name="nota"
              defaultValue={inspeccion.nota ?? ""}
              readOnly={cerrada}
              rows={2}
              className="campo mt-1.5"
              placeholder="Lo que conviene recordar y no cabe en ningún punto."
            />
          </label>

          {!cerrada && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="boton boton-primario">
                Guardar
              </button>
              <span className="text-xs text-texto-3">
                Guarda la hoja completa. Cerrarla es el paso siguiente.
              </span>
            </div>
          )}
        </div>
      </form>

      {!cerrada && (
        <form action={cerrarInspeccion} className="tarjeta flex flex-wrap items-center gap-3 p-4">
          <input type="hidden" name="inspeccionId" value={inspeccion.id} />
          <button type="submit" className="boton boton-secundario">
            Cerrar inspección
          </button>
          <span className="text-sm text-texto-2">
            Da la hoja por revisada. No se puede cerrar con puntos sin revisar ni con un punto
            crítico No OK sin corrección escrita.
          </span>
        </form>
      )}
    </div>
  );
}
