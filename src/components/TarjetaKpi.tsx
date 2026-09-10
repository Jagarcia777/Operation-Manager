import { CLASES_TONO, porcentaje, tonoCumplimiento } from "@/lib/formato";

export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  cumplimiento,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  cumplimiento?: number | null;
}) {
  return (
    <div className="tarjeta px-4 py-3.5">
      <p className="text-xs font-medium tracking-wide text-texto-3 uppercase">{etiqueta}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums">{valor}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {cumplimiento !== undefined && cumplimiento !== null && (
          <span className={`chip ${CLASES_TONO[tonoCumplimiento(cumplimiento)]}`}>
            {porcentaje(cumplimiento)} de meta
          </span>
        )}
        {detalle && <span className="text-xs text-texto-3">{detalle}</span>}
      </div>
    </div>
  );
}
