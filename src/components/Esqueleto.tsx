/**
 * Silueta de carga. Sin esto, al cambiar de pestaña la pantalla anterior se queda congelada
 * mientras el servidor arma la siguiente y la aplicación parece trabada. Con esto el cambio
 * es inmediato y lo que falta es solo el dato.
 */
export function Esqueleto() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-superficie-3" />
        <div className="h-4 w-80 rounded bg-superficie-3 opacity-70" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <div key={indice} className="tarjeta px-4 py-3.5">
            <div className="h-3 w-24 rounded bg-superficie-3" />
            <div className="mt-2.5 h-7 w-32 rounded-md bg-superficie-3" />
            <div className="mt-2 h-3 w-20 rounded bg-superficie-3 opacity-70" />
          </div>
        ))}
      </div>

      <div className="tarjeta p-4">
        <div className="h-3 w-40 rounded bg-superficie-3" />
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2, 3, 4, 5].map((indice) => (
            <div key={indice} className="flex items-center gap-4">
              <div className="h-4 flex-1 rounded bg-superficie-3 opacity-70" />
              <div className="h-4 w-20 rounded bg-superficie-3 opacity-50" />
              <div className="h-4 w-20 rounded bg-superficie-3 opacity-50" />
              <div className="h-4 w-16 rounded bg-superficie-3 opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
