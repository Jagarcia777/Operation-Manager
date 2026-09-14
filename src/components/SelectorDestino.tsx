"use client";

import { useState } from "react";
import { DESTINOS_EXTRACCION, ETIQUETA_DESTINO, type DestinoExtraccion } from "@/lib/dominio";

/**
 * Qué documento se está cargando y contra qué corte. El Resumen Ejecutivo es el único que trae
 * su propia fecha y crea sus dos cortes —el día y el acumulado del mes—, así que cuando se
 * elige, el selector de corte estorba: pedir algo que el documento ya dice es una forma de
 * equivocarse.
 */
export function SelectorDestino({ cortes }: { cortes: { id: string; nombre: string }[] }) {
  const [destino, setDestino] = useState<DestinoExtraccion>("RESUMEN");
  const propioCorte = destino === "RESUMEN";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-texto-2">Qué contiene el documento</span>
          <select
            name="destino"
            className="campo mt-1.5"
            value={destino}
            onChange={(evento) => setDestino(evento.target.value as DestinoExtraccion)}
          >
            {DESTINOS_EXTRACCION.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_DESTINO[opcion]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm" hidden={propioCorte}>
          <span className="text-texto-2">Corte</span>
          <select name="corteId" className="campo mt-1.5" disabled={propioCorte}>
            {cortes.map((corte) => (
              <option key={corte.id} value={corte.id}>
                {corte.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {propioCorte && (
        <p className="text-xs text-texto-3">
          El Resumen Ejecutivo trae su fecha impresa: la aplicación crea con ella el corte del
          día y el del acumulado del mes, y carga además la mezcla por categoría, el top de
          productos y la serie diaria de la cadena.
        </p>
      )}
    </div>
  );
}
