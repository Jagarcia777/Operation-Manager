import { Leyenda } from "./Ejes";

export type BarraRango = {
  etiqueta: string;
  /** Índice del área: KPI real ÷ estándar, en porcentaje. */
  indice: number | null;
  /** Extremos del rango de referencia, también como porcentaje del estándar. */
  rangoMin: number | null;
  rangoMax: number | null;
  dentroDelRango: boolean;
};

/**
 * Cada área contra su propio estándar, en un eje común. La banda gris es el rango de
 * referencia internacional; la marca es donde quedó el área. Ponerlo así —y no como
 * cifras sueltas— evita la lectura que rompe el Excel original: que quedar por debajo
 * del punto medio del rango sea ya una desviación.
 */
export function GraficoRango({
  barras,
  alto,
  ancho = 720,
}: {
  barras: BarraRango[];
  alto?: number;
  ancho?: number;
}) {
  if (!barras.length) return null;

  const margen = { arriba: 22, derecha: 44, abajo: 24, izquierda: 200 };
  const pasoFila = 26;
  const altoTotal = alto ?? margen.arriba + margen.abajo + barras.length * pasoFila;
  const util = ancho - margen.izquierda - margen.derecha;

  // El eje llega hasta donde haga falta, pero nunca por debajo del 120 %: sin ese aire, un
  // conjunto de áreas cumplidas se vería pegado al borde y parecería al límite.
  const techo = Math.max(
    120,
    ...barras.map((barra) => Math.max(barra.indice ?? 0, barra.rangoMax ?? 0)),
  );
  const x = (valor: number) => margen.izquierda + (Math.min(valor, techo) / techo) * util;
  const marcas = [0, 50, 100, techo > 150 ? Math.round(techo / 50) * 50 : 150].filter(
    (marca, indice, todas) => marca <= techo && todas.indexOf(marca) === indice,
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${altoTotal}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Índice de eficiencia por área contra su rango de referencia"
        >
          {marcas.map((marca) => (
            <g key={marca}>
              <line
                x1={x(marca)}
                x2={x(marca)}
                y1={margen.arriba - 6}
                y2={altoTotal - margen.abajo}
                stroke={marca === 100 ? "var(--borde)" : "var(--borde-suave)"}
                strokeWidth="1"
                strokeDasharray={marca === 100 ? "3 3" : undefined}
              />
              <text
                x={x(marca)}
                y={altoTotal - margen.abajo + 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--texto-3)"
              >
                {marca} %
              </text>
            </g>
          ))}

          {barras.map((barra, indice) => {
            const y = margen.arriba + indice * pasoFila;
            const centro = y + pasoFila / 2 - 4;
            const tieneRango = barra.rangoMin !== null && barra.rangoMax !== null;
            const color = barra.dentroDelRango
              ? "var(--exito)"
              : barra.indice !== null && barra.indice >= 90
                ? "var(--atencion)"
                : "var(--alerta)";

            return (
              <g key={barra.etiqueta}>
                <text
                  x={margen.izquierda - 10}
                  y={centro + 3.5}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--texto-2)"
                >
                  {barra.etiqueta.length > 30
                    ? `${barra.etiqueta.slice(0, 29)}…`
                    : barra.etiqueta}
                </text>

                {tieneRango && (
                  <rect
                    x={x(barra.rangoMin as number)}
                    y={centro - 7}
                    width={Math.max(
                      2,
                      x(barra.rangoMax as number) - x(barra.rangoMin as number),
                    )}
                    height={14}
                    rx={3}
                    fill="var(--superficie-3)"
                  />
                )}

                {barra.indice !== null ? (
                  <>
                    <rect
                      x={margen.izquierda}
                      y={centro - 2.5}
                      width={Math.max(1, x(barra.indice) - margen.izquierda)}
                      height={5}
                      rx={2.5}
                      fill={color}
                      opacity={0.32}
                    />
                    <circle cx={x(barra.indice)} cy={centro} r={4.5} fill={color} />
                    <text
                      x={Math.min(x(barra.indice) + 10, ancho - 4)}
                      y={centro + 3.5}
                      fontSize="10"
                      fill="var(--texto-3)"
                      textAnchor={x(barra.indice) > ancho - 60 ? "end" : "start"}
                    >
                      {Math.round(barra.indice)} %
                    </text>
                  </>
                ) : (
                  <text x={margen.izquierda + 4} y={centro + 3.5} fontSize="10" fill="var(--texto-3)">
                    sin datos
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <Leyenda
        series={[
          { etiqueta: "Rango de referencia", color: "var(--superficie-3)" },
          { etiqueta: "Cumple", color: "var(--exito)" },
          { etiqueta: "Cerca", color: "var(--atencion)" },
          { etiqueta: "Bajo estándar", color: "var(--alerta)" },
        ]}
      />
    </div>
  );
}
