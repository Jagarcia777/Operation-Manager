import type { ReactNode } from "react";

export function Seccion({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg">
          <span className="mr-2 text-texto-3">{numero}.</span>
          {titulo}
        </h2>
        {descripcion && <p className="mt-0.5 text-sm text-texto-2">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
  etiqueta,
  valor,
  pie,
}: {
  etiqueta: string;
  valor: string;
  pie?: string;
}) {
  return (
    <div className="tarjeta px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold tracking-[-0.02em] tabular-nums">{valor}</p>
      {pie && <p className="mt-0.5 text-xs text-texto-3">{pie}</p>}
    </div>
  );
}
