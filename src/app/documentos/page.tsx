import { EstadoVacio } from "@/components/EstadoVacio";
import { cargarTiendas, listarCortes } from "@/lib/consultas";

export default async function DocumentosPage() {
  const [cortes, tiendas] = await Promise.all([listarCortes(), cargarTiendas()]);

  if (!cortes.length) {
    return <EstadoVacio mensaje="Necesitas al menos un corte cargado para generar documentos." />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Documentos</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Los mismos números del tablero, armados para una reunión: se ven en pantalla, se imprimen
          a PDF y se descargan en PowerPoint o Word.
        </p>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <form action="/documentos/tienda" className="tarjeta space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Presentación de tienda</h2>
            <p className="mt-1 text-sm text-texto-2">
              Diagnóstico de una tienda para la reunión de gerencia: desempeño contra meta, su
              posición en la zona y en la cadena, dónde pierde dinero y qué plan tiene abierto.
            </p>
          </div>
          <label className="block text-sm">
            <span className="text-texto-2">Corte</span>
            <select name="corte" className="campo mt-1.5">
              {cortes.map((corte) => (
                <option key={corte.id} value={corte.id}>
                  {corte.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-texto-2">Tienda</span>
            <select name="tienda" className="campo mt-1.5">
              {tiendas.map((tienda) => (
                <option key={tienda.id} value={tienda.id}>
                  {tienda.nombre} · {tienda.zona.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end">
            <button type="submit" className="boton boton-primario">
              Abrir presentación
            </button>
          </div>
        </form>

        <form action="/documentos/ejecutivo" className="tarjeta space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Informe ejecutivo</h2>
            <p className="mt-1 text-sm text-texto-2">
              Cierre del corte para gerencia: resultado de la cadena, comparativo entre zonas,
              mejores y rezagadas, pérdidas por tipología y los hallazgos del análisis.
            </p>
          </div>
          <label className="block text-sm">
            <span className="text-texto-2">Corte</span>
            <select name="corte" className="campo mt-1.5">
              {cortes.map((corte) => (
                <option key={corte.id} value={corte.id}>
                  {corte.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end">
            <button type="submit" className="boton boton-primario">
              Abrir informe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
