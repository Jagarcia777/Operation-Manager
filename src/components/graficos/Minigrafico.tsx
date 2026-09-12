/** Sparkline para las tarjetas de indicador: la tendencia sin ocupar sitio. */
export function Minigrafico({
  valores,
  alto = 34,
  ancho = 110,
  tono = "acento",
}: {
  valores: (number | null)[];
  alto?: number;
  ancho?: number;
  tono?: "acento" | "exito" | "alerta" | "texto-3";
}) {
  const limpios = valores.filter((valor): valor is number => valor !== null && Number.isFinite(valor));
  if (limpios.length < 2) return null;

  const maximo = Math.max(...limpios);
  const minimo = Math.min(...limpios);
  const rango = maximo - minimo || 1;
  const paso = ancho / (limpios.length - 1);
  const y = (valor: number) => 3 + (1 - (valor - minimo) / rango) * (alto - 6);

  const puntos = limpios.map((valor, indice) => `${indice * paso},${y(valor)}`);
  const color = `var(--${tono})`;

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-[34px] w-[110px]" aria-hidden>
      <path
        d={`M 0,${alto} L ${puntos.join(" L ")} L ${ancho},${alto} Z`}
        fill={color}
        opacity="0.10"
      />
      <polyline
        points={puntos.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={ancho} cy={y(limpios[limpios.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}
