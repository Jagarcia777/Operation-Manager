import { MARGEN, Leyenda, Rejilla, abreviar, ejeY } from "./Ejes";

export type BarraComparada = {
  etiqueta: string;
  meta: number | null;
  real: number | null;
  destacada?: boolean;
};

/** Meta contra real, tienda por tienda. Se lee de un vistazo quién quedó corto. */
export function GraficoBarras({
  barras,
  alto = 240,
  ancho = 720,
}: {
  barras: BarraComparada[];
  alto?: number;
  ancho?: number;
}) {
  if (!barras.length) return null;

  const escala = ejeY(
    barras.flatMap((barra) => [barra.meta ?? NaN, barra.real ?? NaN]),
    alto,
  );
  const util = ancho - MARGEN.izquierda - MARGEN.derecha;
  const paso = util / barras.length;
  const anchoBarra = Math.min(26, paso * 0.32);
  const base = escala.y(escala.minimo);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Meta contra real por tienda"
        >
          <Rejilla marcas={escala.marcas} y={escala.y} ancho={ancho} formato={abreviar} />

          {barras.map((barra, indice) => {
            const centro = MARGEN.izquierda + paso * (indice + 0.5);
            const cumple = (barra.real ?? 0) >= (barra.meta ?? 0);
            return (
              <g key={barra.etiqueta}>
                {barra.meta !== null && (
                  <rect
                    x={centro - anchoBarra - 2}
                    y={escala.y(barra.meta)}
                    width={anchoBarra}
                    height={Math.max(1, base - escala.y(barra.meta))}
                    rx="3"
                    fill="var(--borde)"
                  />
                )}
                {barra.real !== null && (
                  <rect
                    x={centro + 2}
                    y={escala.y(barra.real)}
                    width={anchoBarra}
                    height={Math.max(1, base - escala.y(barra.real))}
                    rx="3"
                    fill={cumple ? "var(--exito)" : "var(--alerta)"}
                  />
                )}
                <text
                  x={centro}
                  y={alto - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--texto-3)"
                >
                  {barra.etiqueta.length > 14
                    ? `${barra.etiqueta.slice(0, 13)}…`
                    : barra.etiqueta}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Leyenda
        series={[
          { etiqueta: "Meta", color: "var(--borde)" },
          { etiqueta: "Real, en meta", color: "var(--exito)" },
          { etiqueta: "Real, por debajo", color: "var(--alerta)" },
        ]}
      />
    </div>
  );
}
