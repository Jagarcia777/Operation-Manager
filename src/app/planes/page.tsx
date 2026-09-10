import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { listarCortes } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ALCANCES_PLAN, ETIQUETA_ALCANCE_PLAN } from "@/lib/dominio";
import { fechaCorta, moneda } from "@/lib/formato";
import { crearPlan } from "./acciones";

const TONO_ESTADO: Record<string, string> = {
  BORRADOR: "bg-superficie-3 text-texto-2",
  ACTIVO: "bg-acento-tenue text-acento",
  CERRADO: "bg-exito-tenue text-exito",
};

export default async function PlanesPage() {
  const [planes, zonas, tiendas, cortes] = await Promise.all([
    prisma.planAccion.findMany({
      include: { zona: true, tienda: true, hitos: true, metas: true },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.zona.findMany({ orderBy: { orden: "asc" } }),
    prisma.tienda.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    listarCortes(),
  ]);

  const oportunidadTotal = planes
    .filter((plan) => plan.estado !== "CERRADO")
    .reduce((total, plan) => total + plan.oportunidadUsd, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Planes de acción</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Transversales o por tienda, cada plan lleva metas cuantificadas, cronograma a tres meses
          y el dinero que está en juego. {moneda(oportunidadTotal)} en oportunidad abierta.
        </p>
      </header>

      <details className="tarjeta p-4">
        <summary className="cursor-pointer text-sm font-medium">Crear un plan nuevo</summary>
        <form action={crearPlan} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-texto-2">Título</span>
              <input
                name="titulo"
                required
                placeholder="Recuperar ticket promedio en Zona José Peña"
                className="campo mt-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Alcance</span>
              <select name="alcance" className="campo mt-1.5">
                {ALCANCES_PLAN.map((alcance) => (
                  <option key={alcance} value={alcance}>
                    {ETIQUETA_ALCANCE_PLAN[alcance]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Corte de referencia</span>
              <select name="corteId" className="campo mt-1.5">
                <option value="">Sin corte</option>
                {cortes.map((corte) => (
                  <option key={corte.id} value={corte.id}>
                    {corte.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Zona (si aplica)</span>
              <select name="zonaId" className="campo mt-1.5">
                <option value="">—</option>
                {zonas.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Tienda (si aplica)</span>
              <select name="tiendaId" className="campo mt-1.5">
                <option value="">—</option>
                {tiendas.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>
                    {tienda.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-texto-2">Diagnóstico</span>
              <textarea name="diagnostico" rows={3} className="campo mt-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Oportunidad en $</span>
              <input
                name="oportunidadUsd"
                type="number"
                step="any"
                className="campo mt-1.5"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="boton boton-primario">
              Crear plan
            </button>
          </div>
        </form>
      </details>

      {planes.length === 0 ? (
        <EstadoVacio mensaje="Todavía no hay planes. Créalos aquí o directamente desde una recomendación del análisis." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {planes.map((plan) => {
            const completados = plan.hitos.filter((hito) => hito.estado === "COMPLETADO").length;
            return (
              <Link
                key={plan.id}
                href={`/planes/${plan.id}`}
                className="tarjeta block p-4 transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{plan.titulo}</p>
                  <span className={`chip ${TONO_ESTADO[plan.estado]}`}>{plan.estado}</span>
                </div>
                <p className="mt-1 text-xs text-texto-3">
                  {plan.tienda?.nombre ?? plan.zona?.nombre ?? "Toda la cadena"} ·{" "}
                  {fechaCorta(plan.creadoEn)}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="font-medium">{moneda(plan.oportunidadUsd)}</span>
                  <span className="text-texto-3">
                    {plan.metas.length} metas · {completados}/{plan.hitos.length} hitos
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
