import { Fragment, type ReactNode } from "react";

// Tabla estándar de la app: tiendas agrupadas por zona, subtotal de cada zona y total de cadena.
// Los subtotales llegan ya calculados; esta tabla nunca suma nada por su cuenta.

export type ColumnaTabla<F, S> = {
  titulo: string;
  celda: (fila: F) => ReactNode;
  resumen: (resumen: S) => ReactNode;
  numerica?: boolean;
};

export type BloqueTabla<F, S> = {
  zonaId: string;
  zona: string;
  gerente: string;
  /** Aclaración junto al nombre de la zona, p. ej. que entra sin detalle de tienda. */
  nota?: string;
  tiendas: F[];
  subtotal: S;
};

export function TablaZonas<F extends { tiendaId: string; tienda: string }, S>({
  zonas,
  total,
  columnas,
  etiquetaTotal = "Total cadena",
}: {
  zonas: BloqueTabla<F, S>[];
  total: S;
  columnas: ColumnaTabla<F, S>[];
  etiquetaTotal?: string;
}) {
  return (
    <div className="tarjeta overflow-x-auto">
      <table className="tabla">
        <thead>
          <tr>
            <th className="text-left">Tienda</th>
            {columnas.map((columna) => (
              <th key={columna.titulo} className={columna.numerica ? "text-right" : "text-left"}>
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zonas.map((bloque) => (
            <Fragment key={bloque.zonaId}>
              <tr className="fila-zona">
                <td>
                  {bloque.zona}
                  {bloque.nota && (
                    <span className="ml-2 text-xs font-normal text-texto-3">{bloque.nota}</span>
                  )}
                </td>
                {columnas.map((columna) => (
                  <td
                    key={columna.titulo}
                    className={columna.numerica ? "cifra" : undefined}
                  >
                    {columna.resumen(bloque.subtotal)}
                  </td>
                ))}
              </tr>
              {bloque.tiendas.map((fila) => (
                <tr key={fila.tiendaId} className="transition-colors hover:bg-superficie-2">
                  <td className="pl-6 text-texto-2">{fila.tienda}</td>
                  {columnas.map((columna) => (
                    <td
                      key={columna.titulo}
                      className={columna.numerica ? "cifra" : undefined}
                    >
                      {columna.celda(fila)}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
          <tr className="fila-total">
            <td>{etiquetaTotal}</td>
            {columnas.map((columna) => (
              <td key={columna.titulo} className={columna.numerica ? "cifra" : undefined}>
                {columna.resumen(total)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
