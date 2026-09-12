import { Minigrafico } from "@/components/graficos/Minigrafico";
import type { ComparativaMensual } from "@/lib/consultas";
import { moneda, numero, porcentaje } from "@/lib/formato";

/**
 * Evolución mes a mes, tienda por tienda. Con seis series en un mismo gráfico las líneas se
 * encinan y no se lee ninguna; una minigráfica por fila deja comparar la forma de cada tienda
 * sin perder las cifras al lado.
 */
export function TablaEvolucion({
  comparativa,
  indicador,
}: {
  comparativa: ComparativaMensual;
  indicador: "ventas" | "ticket" | "margen" | "logro";
}) {
  const { etiquetas, tiendas } = comparativa;
  if (!etiquetas.length) return null;

  const formato = (valor: number | null) => {
    if (valor === null) return "—";
    if (indicador === "ventas") return moneda(valor);
    if (indicador === "ticket") return moneda(valor, true);
    return porcentaje(valor);
  };

  return (
    <div className="tarjeta overflow-x-auto">
      <table className="tabla">
        <thead>
          <tr>
            <th className="text-left">Tienda</th>
            {etiquetas.map((etiqueta) => (
              <th key={etiqueta} className="text-right">
                {etiqueta}
              </th>
            ))}
            <th className="text-right">Tendencia</th>
            <th className="text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          {tiendas.map((tienda) => {
            const serie = tienda[indicador];
            const conDato = serie.filter((valor): valor is number => valor !== null);
            const primero = conDato[0] ?? null;
            const ultimo = conDato[conDato.length - 1] ?? null;

            // Una tienda que abrió a mitad de la serie compara contra su primer mes con
            // datos, no contra el principio de la tabla: si no, su rampa parece crecimiento.
            const variacion =
              primero !== null && ultimo !== null && primero !== 0
                ? ((ultimo - primero) / Math.abs(primero)) * 100
                : null;

            const tono =
              variacion === null ? "texto-3" : variacion >= 0 ? "exito" : "alerta";

            return (
              <tr key={tienda.tiendaId}>
                <td>{tienda.tienda}</td>
                {serie.map((valor, indice) => (
                  <td key={etiquetas[indice]} className="cifra">
                    {valor === null ? <span className="text-texto-3">—</span> : formato(valor)}
                  </td>
                ))}
                <td className="cifra">
                  <div className="flex justify-end">
                    <Minigrafico valores={serie} tono={tono === "alerta" ? "alerta" : "exito"} />
                  </div>
                </td>
                <td className={`cifra text-${tono}`}>
                  {variacion === null ? "—" : `${variacion >= 0 ? "+" : ""}${numero(variacion, 1)} %`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
