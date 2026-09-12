/**
 * Composición en una barra apilada: de qué está hecho el total. Se usa para los ajustes,
 * donde la pregunta no es cuánto sino en qué se va.
 */
export type Porcion = { etiqueta: string; valor: number };

const TONOS = [
  "var(--acento)",
  "var(--alerta)",
  "var(--atencion)",
  "var(--exito)",
  "var(--texto-3)",
  "var(--borde)",
];

export function GraficoComposicion({ porciones }: { porciones: Porcion[] }) {
  // Los ajustes van en negativo: la composición se mide en magnitud.
  const magnitudes = porciones.map((porcion) => ({
    ...porcion,
    magnitud: Math.abs(porcion.valor),
  }));
  const total = magnitudes.reduce((suma, porcion) => suma + porcion.magnitud, 0);
  if (!total) return null;

  const ordenadas = [...magnitudes].sort((a, b) => b.magnitud - a.magnitud);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-superficie-3">
        {ordenadas.map((porcion, indice) => (
          <div
            key={porcion.etiqueta}
            style={{
              width: `${(porcion.magnitud / total) * 100}%`,
              background: TONOS[indice % TONOS.length],
            }}
            title={`${porcion.etiqueta}: ${((porcion.magnitud / total) * 100).toFixed(1)} %`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {ordenadas.map((porcion, indice) => (
          <li key={porcion.etiqueta} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: TONOS[indice % TONOS.length] }}
              aria-hidden
            />
            <span className="flex-1 truncate text-texto-2">{porcion.etiqueta}</span>
            <span className="cifra text-texto-3">
              {((porcion.magnitud / total) * 100).toFixed(1).replace(".", ",")} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
