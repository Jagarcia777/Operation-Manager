import { Leyenda, abreviar } from "./Ejes";

// Márgenes propios: las etiquetas giradas piden sitio abajo y a la izquierda, y el eje
// de porcentaje acumulado necesita su franja a la derecha.
const MARGEN = { arriba: 18, derecha: 40, abajo: 76, izquierda: 50 };

export type BarraPareto = {
  etiqueta: string;
  valor: number;
  acumulado: number;
  /** Lo decide quien llama, con el mismo criterio de la tabla: dos fuentes de verdad para
   *  la misma clasificación acabarían pintando de gris una fila marcada como vital. */
  vital: boolean;
};

/**
 * Pareto: barras de venta por categoría y la curva del acumulado. La línea del 80 % marca
 * dónde se corta lo vital de lo accesorio, que es la decisión que el gráfico sirve.
 */
export function GraficoPareto({
  barras,
  alto = 320,
  ancho = 760,
}: {
  barras: BarraPareto[];
  alto?: number;
  ancho?: number;
}) {
  if (!barras.length) return null;

  const maximo = Math.max(...barras.map((barra) => barra.valor));
  const util = ancho - MARGEN.izquierda - MARGEN.derecha;
  const alturaUtil = alto - MARGEN.arriba - MARGEN.abajo;
  const paso = util / barras.length;
  const anchoBarra = Math.min(38, paso * 0.62);
  const base = MARGEN.arriba + alturaUtil;

  const yBarra = (valor: number) => base - (valor / (maximo * 1.1)) * alturaUtil;
  const yCurva = (porcentaje: number) => base - (porcentaje / 100) * alturaUtil;
  const x = (indice: number) => MARGEN.izquierda + paso * (indice + 0.5);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[620px]"
          role="img"
          aria-label="Pareto de categorías"
        >
          {[0, 25, 50, 75, 100].map((porcentaje) => (
            <g key={porcentaje}>
              <line
                x1={MARGEN.izquierda}
                x2={ancho - MARGEN.derecha}
                y1={yCurva(porcentaje)}
                y2={yCurva(porcentaje)}
                stroke="var(--borde-suave)"
              />
              <text
                x={ancho - MARGEN.derecha + 6}
                y={yCurva(porcentaje) + 3.5}
                fontSize="9"
                fill="var(--texto-3)"
              >
                {porcentaje} %
              </text>
            </g>
          ))}

          <line
            x1={MARGEN.izquierda}
            x2={ancho - MARGEN.derecha}
            y1={yCurva(80)}
            y2={yCurva(80)}
            stroke="var(--atencion)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />

          {barras.map((barra, indice) => (
            <g key={barra.etiqueta}>
              <rect
                x={x(indice) - anchoBarra / 2}
                y={yBarra(barra.valor)}
                width={anchoBarra}
                height={Math.max(1, base - yBarra(barra.valor))}
                rx="3"
                fill={barra.vital ? "var(--acento)" : "var(--borde)"}
              />
              <text
                x={x(indice)}
                y={base + 12}
                textAnchor="end"
                fontSize="9.5"
                fill="var(--texto-3)"
                transform={`rotate(-38 ${x(indice)} ${base + 12})`}
              >
                {barra.etiqueta.length > 14 ? `${barra.etiqueta.slice(0, 13)}…` : barra.etiqueta}
              </text>
            </g>
          ))}

          <polyline
            points={barras.map((barra, indice) => `${x(indice)},${yCurva(barra.acumulado)}`).join(" ")}
            fill="none"
            stroke="var(--texto-2)"
            strokeWidth="1.75"
          />
          {barras.map((barra, indice) => (
            <circle
              key={barra.etiqueta}
              cx={x(indice)}
              cy={yCurva(barra.acumulado)}
              r="2.5"
              fill="var(--superficie)"
              stroke="var(--texto-2)"
              strokeWidth="1.5"
            />
          ))}

          <text x={MARGEN.izquierda - 8} y={yBarra(maximo) + 3.5} textAnchor="end" fontSize="9" fill="var(--texto-3)">
            {abreviar(maximo)}
          </text>
          <text x={MARGEN.izquierda - 8} y={base + 3.5} textAnchor="end" fontSize="9" fill="var(--texto-3)">
            0
          </text>
        </svg>
      </div>
      <Leyenda
        series={[
          { etiqueta: "Dentro del 80 %", color: "var(--acento)" },
          { etiqueta: "Resto", color: "var(--borde)" },
          { etiqueta: "Acumulado", color: "var(--texto-2)" },
        ]}
      />
    </div>
  );
}
