"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Red de seguridad. Sin esto, cualquier fallo del servidor se muestra como
 * "Application error: a server-side exception has occurred" con un código hexadecimal:
 * una pantalla que no dice nada y de la que no se sale.
 */
export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="tarjeta max-w-md p-7 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-alerta-tenue">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-5 text-alerta"
            aria-hidden
          >
            <path d="M10 6v4.5M10 13.5h.01M10 2.5 17.5 16.5H2.5z" />
          </svg>
        </div>

        <h1 className="mt-4 text-lg">Algo se rompió en esta pantalla</h1>
        <p className="mt-2 text-sm text-texto-2">
          Los datos están a salvo: esto falló al mostrarlos, no al guardarlos. Vuelve a
          intentarlo y, si sigue igual, entra por otra sección.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-texto-3">Referencia {error.digest}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="boton boton-primario">
            Reintentar
          </button>
          <Link href="/" className="boton boton-secundario">
            Ir a Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
