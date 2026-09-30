import { CampoArchivo } from "@/components/CampoArchivo";
import { EstadoVacio } from "@/components/EstadoVacio";
import { Pestanas } from "@/components/Pestanas";
import { SelectorCorte } from "@/components/SelectorCorte";
import { TAMANO_MAXIMO } from "@/lib/carga";
import { listarCortes, resolverCorte } from "@/lib/consultas";
import { COLUMNAS_CSV } from "@/lib/csv";
import { importarCsv } from "../acciones";

const AVISOS: Record<string, string> = {
  falta: "Elige un archivo antes de continuar.",
  peso: "El archivo supera los 4 MB. Una hoja con las tiendas del corte pesa mucho menos.",
};

export default async function ImportarCsvPage({ searchParams }: PageProps<"/cargar/csv">) {
  const parametros = await searchParams;
  const corteId = typeof parametros.corte === "string" ? parametros.corte : undefined;
  const error = typeof parametros.error === "string" ? parametros.error : null;

  const [cortes, corte] = await Promise.all([listarCortes(), resolverCorte(corteId)]);
  if (!corte) return <EstadoVacio mensaje="Crea un corte en Configuración antes de importar." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Importar CSV</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Para cuando las cifras llegan en una hoja de cálculo. Descarga la plantilla, pega los
            números por tienda y súbela: antes de guardar pasa por la misma revisión que un
            documento leído.
          </p>
        </div>
        <SelectorCorte cortes={cortes} actual={corte.id} />
      </header>

      <Pestanas
        pestanas={[
          { href: "/cargar", etiqueta: "Leer un documento", activa: false },
          { href: `/cargar/csv?corte=${corte.id}`, etiqueta: "Importar CSV", activa: true },
          { href: `/cargar/manual?corte=${corte.id}`, etiqueta: "Captura manual", activa: false },
        ]}
      />

      {error && (
        <p className="tarjeta border-alerta-tenue bg-alerta-tenue px-4 py-3 text-sm text-alerta">
          {AVISOS[error] ?? error}
        </p>
      )}

      <form action={importarCsv} className="tarjeta space-y-4 p-5">
        <input type="hidden" name="corteId" value={corte.id} />
        <CampoArchivo
          nombre="archivo"
          acepta=".csv,text/csv"
          maximoBytes={TAMANO_MAXIMO}
          etiqueta="Archivo CSV"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/api/plantilla-csv" className="boton boton-secundario" download>
            Descargar plantilla
          </a>
          <button type="submit" className="boton boton-primario">
            Revisar importación
          </button>
        </div>
      </form>

      <section className="tarjeta p-5 text-sm text-texto-2">
        <h2 className="text-sm font-semibold text-texto">Cómo va la plantilla</h2>
        <p className="mt-2">
          Una fila por tienda y estas columnas, en este orden:{" "}
          {COLUMNAS_CSV.map((columna) => columna.encabezado).join(", ")}.
        </p>
        <ul className="mt-2 space-y-1">
          <li>· Sirve separada por punto y coma o por coma, y con decimales en coma o en punto.</li>
          <li>· Una celda vacía se guarda como faltante, no como cero. Una meta en cero, también.</li>
          <li>
            · Las filas de total o subtotal no se guardan como tienda: se comparan contra la suma y,
            si no cuadran, se levanta una alerta.
          </li>
          <li>· El %MB va como número: 24,5 para 24,5 %.</li>
        </ul>
      </section>
    </div>
  );
}
