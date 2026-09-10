/**
 * Monograma de la marca personal, en SVG puro: sin archivos ni fuentes remotas, y nítido en
 * cualquier tamaño. La forma es un squircle, la del icono de aplicación de macOS.
 */
export function Monograma({
  iniciales = "JG",
  tamano = 32,
}: {
  iniciales?: string;
  tamano?: number;
}) {
  const letras = iniciales.slice(0, 2).toUpperCase();

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Monograma ${letras}`}
      className="shrink-0"
    >
      <rect width="64" height="64" rx="15" className="fill-[var(--monograma-fondo)]" />
      {/* Filo interior de un píxel: el detalle que separa un icono plano de uno acabado. */}
      <rect
        x="0.5"
        y="0.5"
        width="63"
        height="63"
        rx="14.5"
        fill="none"
        stroke="var(--monograma-filo)"
        strokeWidth="1"
      />
      <text
        x="32"
        y="41.5"
        textAnchor="middle"
        fontSize="27"
        fontWeight="600"
        letterSpacing="-1.4"
        className="fill-[var(--monograma-texto)]"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
        }}
      >
        {letras}
      </text>
    </svg>
  );
}
