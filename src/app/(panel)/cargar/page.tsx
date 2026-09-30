import Link from "next/link";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { listarCortes } from "@/lib/consultas";
import { prisma } from "@/lib/db";
import { ETIQUETA_DESTINO, type DestinoExtraccion } from "@/lib/dominio";
import { hayClaveIA } from "@/lib/extraccion/extraer";
import { fechaCorta } from "@/lib/formato";
import { CampoArchivo } from "@/components/CampoArchivo";
import { SelectorDestino } from "@/components/SelectorDestino";
import { ACEPTA, TAMANO_MAXIMO } from "@/lib/carga";
import { borrarExtraccion, subirYExtraer } from "./acciones";

const ESTADO_TEXTO: Record<string, string> = {
  PENDIENTE: "Procesando",
  EXTRAIDO: "Listo para revisar",
  CONFIRMADO: "Confirmado",
  ERROR: "Con error",
};

const AVISOS: Record<string, string> = {
  falta: "Elige un corte y un archivo antes de continuar.",
  tipo: "Ese formato no se puede leer. Acepta PDF, PNG, JPG o WEBP.",
  peso: "El archivo supera los 4 MB. Exporta solo la página del tablero, o manda la foto en tamaño mediano.",
};

const ESTADO_TONO: Record<string, string> = {
  PENDIENTE: "bg-superficie-3 text-texto-2",
  EXTRAIDO: "bg-acento-tenue text-acento",
  CONFIRMADO: "bg-exito-tenue text-exito",
  ERROR: "bg-alerta-tenue text-alerta",
};

export default async function CargarPage({ searchParams }: PageProps<"/cargar">) {
  const parametros = await searchParams;
  const error = typeof parametros.error === "string" ? parametros.error : null;
  const [cortes, extracciones] = await Promise.all([
    listarCortes(),
    prisma.extraccion.findMany({
      include: { corte: true },
      orderBy: { creadaEn: "desc" },
      take: 12,
    }),
  ]);

  const conClave = hayClaveIA();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Cargar datos</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Sube el Dashboard Ejecutivo en PDF o imagen y la app lee las cifras por tienda. Nada se
          guarda hasta que revises y confirmes lo extraído.
        </p>
      </header>

      <Pestanas
        pestanas={[
          { href: "/cargar", etiqueta: "Leer un documento", activa: true },
          { href: "/cargar/csv", etiqueta: "Importar CSV", activa: false },
          { href: "/cargar/manual", etiqueta: "Captura manual", activa: false },
        ]}
      />

      {error && AVISOS[error] && (
        <p className="tarjeta border-alerta-tenue bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {AVISOS[error]}
        </p>
      )}

      {!conClave && (
        <div className="tarjeta border-atencion-tenue bg-atencion-tenue px-4 py-3 text-sm text-atencion">
          Falta <code>ANTHROPIC_API_KEY</code> en las variables de entorno. Sin ella solo se leen
          los reportes de ventas por categoría de cada tienda, que no necesitan IA; el resto de la
          aplicación funciona igual.
        </div>
      )}

      {/* El Resumen Ejecutivo crea sus propios cortes, así que la carga nunca está bloqueada
          por no tener uno: solo los otros dos documentos necesitan uno ya creado. */}
      <form action={subirYExtraer} className="tarjeta space-y-4 p-5">
          <SelectorDestino cortes={cortes.map((corte) => ({ id: corte.id, nombre: corte.nombre }))} />

          <CampoArchivo
            nombre="archivo"
            acepta={ACEPTA}
            maximoBytes={TAMANO_MAXIMO}
            varios
          />

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-texto-3">
              El archivo se guarda en tu equipo. Al modelo solo se le envía este documento.
            </p>
            {/* Sin clave sigue activo: el reporte de categorías por tienda no necesita IA. */}
            <button type="submit" className="boton boton-primario">
              Leer documento
            </button>
          </div>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-texto-2">Cargas recientes</h2>
        {extracciones.length === 0 ? (
          <EstadoVacio mensaje="Todavía no has cargado ningún documento." />
        ) : (
          <div className="tarjeta divide-y divide-borde-suave">
            {extracciones.map((extraccion) => (
              <div
                key={extraccion.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{extraccion.archivoNombre}</p>
                  <p className="text-xs text-texto-3">
                    {extraccion.corte?.nombre ?? "Sin corte"} ·{" "}
                    {ETIQUETA_DESTINO[extraccion.destino as DestinoExtraccion] ??
                      extraccion.destino}{" "}
                    ·{" "}
                    {fechaCorta(extraccion.creadaEn)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${ESTADO_TONO[extraccion.estado]}`}>
                    {ESTADO_TEXTO[extraccion.estado] ?? extraccion.estado}
                  </span>
                  <a
                    href={`/api/extracciones/${extraccion.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="boton boton-secundario"
                  >
                    Ver original
                  </a>
                  {extraccion.estado === "EXTRAIDO" && (
                    <Link href={`/cargar/${extraccion.id}`} className="boton boton-secundario">
                      Revisar
                    </Link>
                  )}
                  <form action={borrarExtraccion}>
                    <input type="hidden" name="id" value={extraccion.id} />
                    <button type="submit" className="boton boton-secundario">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
