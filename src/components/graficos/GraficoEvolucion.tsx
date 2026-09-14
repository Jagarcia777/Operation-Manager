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
  series = { real: "Venta real", meta: "Meta" },
  formato = abreviar,
  desdeCero = true,
}: {
  puntos: PuntoEvolucion[];
  alto?: number;
  ancho?: number;
  /** Cómo se llaman las dos líneas. Un índice no se lee igual que una venta. */
  series?: { real: string; meta: string };
  formato?: (valor: number) => string;
  /**
   * Un índice que se mueve entre 93 % y 106 % queda plano si el eje arranca en cero: ahí la
   * pregunta no es cuánto vale, sino hacia dónde va. Para dinero sí manda empezar en cero,
   * que es el que no admite exageración de escala.
   */
  desdeCero?: boolean;
}) {
  if (puntos.length < 2) return null;

  const valores = puntos.flatMap((punto) => [punto.meta ?? NaN, punto.real ?? NaN]);
  const escala = ejeY(valores, alto, { desdeCero });
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

  // Con doce meses no caben doce etiquetas: se muestra una de cada dos y siempre la última.
  // Si la última cae pegada a la anterior se quita esa, porque dos nombres de mes encimados
  // no se leen ninguno de los dos.
  const saltoEtiqueta = puntos.length > 8 ? 2 : 1;
  const etiquetasVisibles = (() => {
    const indices = new Set<number>();
    for (let i = 0; i < puntos.length; i += saltoEtiqueta) indices.add(i);
    const ultimo = puntos.length - 1;
    if (!indices.has(ultimo)) {
      indices.delete(ultimo - 1);
      indices.add(ultimo);
    }
    return indices;
  })();

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Evolución de ventas contra meta"
        >
          <Rejilla marcas={escala.marcas} y={escala.y} ancho={ancho} formato={formato} />

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
            etiquetasVisibles.has(indice) ? (
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
          { etiqueta: series.real, color: "var(--acento)" },
          { etiqueta: series.meta, color: "var(--texto-3)" },
        ]}
      />
    </div>
  );
}
