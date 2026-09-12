import { MARGEN, Leyenda, Rejilla, abreviar, ejeY } from "./Ejes";

export type PuntoEvolucion = { etiqueta: string; meta: number | null; real: number | null };

/**
 * Evolución mes a mes de meta contra real. Es el gráfico que contesta la primera pregunta
 * de cualquier reunión: ¿vamos mejor o peor que antes, y desde cuándo?
 */
export function GraficoEvolucion({
  puntos,
  alto = 240,
  ancho = 720,
}: {
  puntos: PuntoEvolucion[];
  alto?: number;
  ancho?: number;
}) {
  if (puntos.length < 2) return null;

  const valores = puntos.flatMap((punto) => [punto.meta ?? NaN, punto.real ?? NaN]);
  const escala = ejeY(valores, alto);
  const util = ancho - MARGEN.izquierda - MARGEN.derecha;
  const x = (indice: number) =>
    MARGEN.izquierda + (puntos.length === 1 ? util / 2 : (indice / (puntos.length - 1)) * util);

  const trazo = (obtener: (punto: PuntoEvolucion) => number | null) =>
    puntos
      .map((punto, indice) => {
        const valor = obtener(punto);
        if (valor === null) return null;
        return `${x(indice)},${escala.y(valor)}`;
      })
      .filter((par): par is string => par !== null)
      .join(" ");

  const areaReal = (() => {
    const pares = puntos
      .map((punto, indice) => (punto.real === null ? null : { indice, valor: punto.real }))
      .filter((par): par is { indice: number; valor: number } => par !== null);
    if (pares.length < 2) return null;
    const linea = pares.map((par) => `${x(par.indice)},${escala.y(par.valor)}`).join(" L ");
    const base = escala.y(escala.minimo);
    return `M ${x(pares[0].indice)},${base} L ${linea} L ${x(pares[pares.length - 1].indice)},${base} Z`;
  })();

  // Con doce meses no caben doce etiquetas: se muestran una de cada dos y siempre la última.
  const saltoEtiqueta = puntos.length > 8 ? 2 : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Evolución de ventas contra meta"
        >
          <Rejilla marcas={escala.marcas} y={escala.y} ancho={ancho} formato={abreviar} />

          {areaReal && <path d={areaReal} fill="var(--acento)" opacity="0.08" />}

          <polyline
            points={trazo((punto) => punto.meta)}
            fill="none"
            stroke="var(--texto-3)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <polyline
            points={trazo((punto) => punto.real)}
            fill="none"
            stroke="var(--acento)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {puntos.map((punto, indice) =>
            punto.real === null ? null : (
              <circle
                key={punto.etiqueta}
                cx={x(indice)}
                cy={escala.y(punto.real)}
                r={indice === puntos.length - 1 ? 4 : 2.5}
                fill="var(--superficie)"
                stroke="var(--acento)"
                strokeWidth="2"
              />
            ),
          )}

          {puntos.map((punto, indice) =>
            indice % saltoEtiqueta === 0 || indice === puntos.length - 1 ? (
              <text
                key={punto.etiqueta}
                x={x(indice)}
                y={alto - 8}
                // La primera y la última se anclan al borde; centradas se salen del lienzo
                // y la etiqueta acaba cortada a media palabra.
                textAnchor={
                  indice === 0 ? "start" : indice === puntos.length - 1 ? "end" : "middle"
                }
                fontSize="10"
                fill="var(--texto-3)"
              >
                {punto.etiqueta}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <Leyenda
        series={[
          { etiqueta: "Venta real", color: "var(--acento)" },
          { etiqueta: "Meta", color: "var(--texto-3)" },
        ]}
      />
    </div>
  );
}
