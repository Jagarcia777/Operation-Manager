import type { ReactNode } from "react";
import { CLASES_TONO, porcentaje, tonoCumplimiento } from "@/lib/formato";

export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  cumplimiento,
  grafico,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  cumplimiento?: number | null;
  /** Sparkline opcional: la tendencia al lado de la cifra, sin robarle protagonismo. */
  grafico?: ReactNode;
}) {
  return (
    <div className="tarjeta px-4 py-3.5">
      <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">{etiqueta}</p>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums">{valor}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {cumplimiento !== undefined && cumplimiento !== null && (
              <span className={`chip ${CLASES_TONO[tonoCumplimiento(cumplimiento)]}`}>
                {porcentaje(cumplimiento)} de meta
              </span>
            )}
            {detalle && <span className="text-xs text-texto-3">{detalle}</span>}
          </div>
        </div>
        {grafico && <div className="shrink-0 pb-0.5">{grafico}</div>}
      </div>
    </div>
  );
}
