"use client";

import { useState } from "react";
import {
  ESTADOS_CORRECCION,
  ETIQUETA_ESTADO_CORRECCION,
  type Cumplimiento,
  type EstadoCorreccion,
} from "@/lib/dominio";

const OPCIONES: { valor: Cumplimiento; etiqueta: string; clases: string }[] = [
  { valor: "OK", etiqueta: "OK", clases: "peer-checked:bg-exito-tenue peer-checked:text-exito peer-checked:border-exito" },
  { valor: "NO_OK", etiqueta: "No OK", clases: "peer-checked:bg-alerta-tenue peer-checked:text-alerta peer-checked:border-alerta" },
  { valor: "NO_APLICA", etiqueta: "N/A", clases: "peer-checked:bg-superficie-3 peer-checked:text-texto peer-checked:border-borde" },
];

export type ResultadoEditable = {
  id: string;
  actividad: string;
  area: string | null;
  critico: boolean;
  cumple: string;
  observacion: string | null;
  correccion: string | null;
  responsable: string | null;
  fechaLimite: string;
  estado: string;
};

/**
 * Un punto del checklist. Observación, corrección y estatus solo aparecen cuando se marca
 * No OK: pedirlos siempre llena la pantalla de campos vacíos y esconde los que sí importan.
 */
export function FilaInspeccion({
  resultado,
  soloLectura,
}: {
  resultado: ResultadoEditable;
  soloLectura: boolean;
}) {
  const [cumple, setCumple] = useState(resultado.cumple);
  const esHallazgo = cumple === "NO_OK";
  const prefijo = `punto.${resultado.id}`;

  return (
    <div
      className={`grid gap-4 border-t border-borde-suave px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] ${
        esHallazgo ? "bg-alerta-tenue/35" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm">
          {resultado.actividad}
          {resultado.critico && (
            <span className="ml-2 align-middle text-[11px] font-medium tracking-wide text-alerta uppercase">
              Crítico
            </span>
          )}
        </p>
        {resultado.area && <p className="mt-0.5 text-xs text-texto-3">{resultado.area}</p>}
      </div>

      <div className="flex shrink-0 gap-1.5">
        {OPCIONES.map((opcion) => (
          <label key={opcion.valor} className="relative">
            <input
              type="radio"
              name={`${prefijo}.cumple`}
              value={opcion.valor}
              checked={cumple === opcion.valor}
              disabled={soloLectura}
              onChange={() => setCumple(opcion.valor)}
              className="peer sr-only"
            />
            <span
              className={`block cursor-pointer rounded-lg border border-borde-suave px-3 py-1.5 text-sm text-texto-2 transition-colors duration-200 select-none hover:bg-superficie-3 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-acento ${opcion.clases}`}
            >
              {opcion.etiqueta}
            </span>
          </label>
        ))}
      </div>

      {esHallazgo && (
        <div className="grid gap-3 md:col-span-2">
          <label className="block text-sm">
            <span className="text-texto-2">Observación · qué se encontró</span>
            <textarea
              name={`${prefijo}.observacion`}
              defaultValue={resultado.observacion ?? ""}
              readOnly={soloLectura}
              rows={2}
              className="campo mt-1.5"
              placeholder="Describe el hallazgo tal como se vio en tienda."
            />
          </label>

          <label className="block text-sm">
            <span className="text-texto-2">Plan de acción · qué se va a hacer</span>
            <textarea
              name={`${prefijo}.correccion`}
              defaultValue={resultado.correccion ?? ""}
              readOnly={soloLectura}
              rows={2}
              className="campo mt-1.5"
              placeholder="La corrección concreta, no la intención."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-texto-2">Responsable</span>
              <input
                name={`${prefijo}.responsable`}
                defaultValue={resultado.responsable ?? ""}
                readOnly={soloLectura}
                className="campo mt-1.5"
                placeholder="Quién lo cierra"
              />
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Fecha límite</span>
              <input
                type="date"
                name={`${prefijo}.fechaLimite`}
                defaultValue={resultado.fechaLimite}
                readOnly={soloLectura}
                className="campo mt-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-texto-2">Estatus</span>
              <select
                name={`${prefijo}.estado`}
                defaultValue={resultado.estado}
                disabled={soloLectura}
                className="campo mt-1.5"
              >
                {ESTADOS_CORRECCION.map((estado) => (
                  <option key={estado} value={estado}>
                    {ETIQUETA_ESTADO_CORRECCION[estado as EstadoCorreccion]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
