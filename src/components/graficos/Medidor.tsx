/**
 * Arco de indicador contra su referencia. Sirve para lo que tiene un objetivo claro —margen,
 * logro— donde lo que importa no es la serie sino si se llega o no.
 */
export function Medidor({
  valor,
  referencia,
  minimo = 0,
  maximo,
  sufijo = "%",
  etiqueta,
}: {
  valor: number | null;
  referencia: number | null;
  minimo?: number;
  maximo: number;
  sufijo?: string;
  etiqueta?: string;
}) {
  const ancho = 150;
  const alto = 86;
  const radio = 58;
  const centro = { x: ancho / 2, y: alto - 8 };

  const angulo = (v: number) => {
    const acotado = Math.min(Math.max(v, minimo), maximo);
    return Math.PI * (1 - (acotado - minimo) / (maximo - minimo));
  };
  const punto = (v: number, r: number) => ({
    x: centro.x + Math.cos(angulo(v)) * r,
    y: centro.y - Math.sin(angulo(v)) * r,
  });
  const arco = (desde: number, hasta: number, r: number) => {
    const a = punto(desde, r);
    const b = punto(hasta, r);
    return `M ${a.x},${a.y} A ${r},${r} 0 0 1 ${b.x},${b.y}`;
  };

  const cumple = valor !== null && referencia !== null && valor >= referencia;
  const color = valor === null ? "var(--borde)" : cumple ? "var(--exito)" : "var(--atencion)";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-[86px] w-[150px]" aria-hidden>
        <path d={arco(minimo, maximo, radio)} fill="none" stroke="var(--borde-suave)" strokeWidth="9" strokeLinecap="round" />
        {valor !== null && (
          <path d={arco(minimo, valor, radio)} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
        )}
        {referencia !== null && (
          <line
            x1={punto(referencia, radio - 8).x}
            y1={punto(referencia, radio - 8).y}
            x2={punto(referencia, radio + 8).x}
            y2={punto(referencia, radio + 8).y}
            stroke="var(--texto-2)"
            strokeWidth="2"
          />
        )}
        <text x={centro.x} y={centro.y - 14} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--texto)">
          {valor === null ? "—" : `${valor.toFixed(1).replace(".", ",")}${sufijo}`}
        </text>
      </svg>
      {etiqueta && <p className="text-xs text-texto-2">{etiqueta}</p>}
      {referencia !== null && (
        <p className="text-[11px] text-texto-3">
          referencia {referencia.toFixed(1).replace(".", ",")}
          {sufijo}
        </p>
      )}
    </div>
  );
}
