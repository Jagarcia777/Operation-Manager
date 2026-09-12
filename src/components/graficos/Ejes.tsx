/**
 * Piezas compartidas de los gráficos. Todo es SVG escrito a mano: la aplicación no carga
 * recursos de terceros (docs/ESPECIFICACION.md §5), así que no hay librería de charts.
 * Los colores salen de los tokens, de modo que el modo oscuro funciona sin tocar nada.
 */

export const MARGEN = { arriba: 16, derecha: 12, abajo: 26, izquierda: 52 };

export function ejeY(
  valores: number[],
  alto: number,
  { desdeCero = true }: { desdeCero?: boolean } = {},
) {
  const finitos = valores.filter((valor) => Number.isFinite(valor));
  const maximo = finitos.length ? Math.max(...finitos) : 0;
  const minimoReal = finitos.length ? Math.min(...finitos) : 0;
  const minimo = desdeCero ? Math.min(0, minimoReal) : minimoReal;

  // Un poco de aire arriba para que la línea no toque el borde.
  const techo = maximo === minimo ? maximo + 1 : maximo + (maximo - minimo) * 0.12;
  const rango = techo - minimo || 1;
  const util = alto - MARGEN.arriba - MARGEN.abajo;

  return {
    minimo,
    techo,
    y: (valor: number) => MARGEN.arriba + util - ((valor - minimo) / rango) * util,
    marcas: [0, 0.25, 0.5, 0.75, 1].map((fraccion) => minimo + rango * fraccion),
  };
}

export function Rejilla({
  marcas,
  y,
  ancho,
  formato,
}: {
  marcas: number[];
  y: (valor: number) => number;
  ancho: number;
  formato: (valor: number) => string;
}) {
  return (
    <g>
      {marcas.map((marca) => (
        <g key={marca}>
          <line
            x1={MARGEN.izquierda}
            x2={ancho - MARGEN.derecha}
            y1={y(marca)}
            y2={y(marca)}
            stroke="var(--borde-suave)"
            strokeWidth="1"
          />
          <text
            x={MARGEN.izquierda - 8}
            y={y(marca) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="var(--texto-3)"
          >
            {formato(marca)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function Leyenda({ series }: { series: { etiqueta: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {series.map((serie) => (
        <span key={serie.etiqueta} className="flex items-center gap-1.5 text-xs text-texto-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: serie.color }}
            aria-hidden
          />
          {serie.etiqueta}
        </span>
      ))}
    </div>
  );
}

/** Abrevia para los ejes: $12,6M se lee, $12.634.400 no cabe. */
export function abreviar(valor: number): string {
  const absoluto = Math.abs(valor);
  if (absoluto >= 1_000_000) return `${(valor / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (absoluto >= 1_000) return `${Math.round(valor / 1_000)}k`;
  return String(Math.round(valor));
}
