"use client";

import { useState } from "react";

/**
 * Avisa del tamaño antes de enviar. Sin esto, un archivo que pase del tope lo rechaza la
 * plataforma antes de llegar al servidor y el usuario solo ve un error genérico, sin saber
 * que el problema era el peso.
 */
export function CampoArchivo({
  nombre,
  acepta,
  maximoBytes,
  etiqueta,
  varios = false,
}: {
  nombre: string;
  acepta: string;
  maximoBytes: number;
  /** Los formatos que se aceptan, en palabras; por omisión, los documentos que lee la IA. */
  etiqueta?: string;
  /** Permite elegir varios archivos; el tope de peso es para el envío completo. */
  varios?: boolean;
}) {
  const [excedido, setExcedido] = useState<string | null>(null);
  const maximoMb = Math.round(maximoBytes / (1024 * 1024));

  return (
    <div>
      <label className="block text-sm">
        <span className="text-texto-2">
          Archivo ({etiqueta ?? "PDF, PNG, JPG o WEBP"}, hasta {maximoMb} MB)
        </span>
        <input
          type="file"
          name={nombre}
          accept={acepta}
          required
          multiple={varios}
          onChange={(evento) => {
            const archivos = [...(evento.target.files ?? [])];
            const peso = archivos.reduce((total, archivo) => total + archivo.size, 0);
            if (peso > maximoBytes) {
              const pesa = (peso / (1024 * 1024)).toFixed(1);
              setExcedido(
                `${archivos.length > 1 ? "Esos archivos pesan" : "Ese archivo pesa"} ${pesa} MB y el máximo es ${maximoMb} MB.`,
              );
              evento.target.value = "";
              return;
            }
            setExcedido(null);
          }}
          className="campo mt-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-superficie-3 file:px-3 file:py-1 file:text-sm"
        />
      </label>
      {excedido && (
        <p className="mt-2 text-sm text-alerta">
          {excedido} Si es un PDF, exporta solo la página del tablero; si es una foto, mándala
          desde el móvil en tamaño mediano. También puedes teclear las cifras en Captura manual.
        </p>
      )}
    </div>
  );
}
