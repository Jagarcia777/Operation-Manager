"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Opcion = { id: string; nombre: string };

export function SelectorCorte({ cortes, actual }: { cortes: Opcion[]; actual: string }) {
  const router = useRouter();
  const parametros = useSearchParams();
  // Cambiar de corte vuelve a consultar la base: sin señal de que algo pasa, el usuario
  // cree que no registró el clic y lo vuelve a intentar.
  const [pendiente, iniciar] = useTransition();

  return (
    <label className="no-imprimir flex items-center gap-2 text-sm text-texto-2">
      Corte
      <span className="relative flex items-center">
        <select
          className="campo w-auto min-w-52 transition-opacity duration-200"
          style={{ opacity: pendiente ? 0.55 : 1 }}
          value={actual}
          disabled={pendiente}
          onChange={(evento) => {
            const siguientes = new URLSearchParams(parametros);
            siguientes.set("corte", evento.target.value);
            iniciar(() => router.push(`?${siguientes.toString()}`));
          }}
        >
          {cortes.map((corte) => (
            <option key={corte.id} value={corte.id}>
              {corte.nombre}
            </option>
          ))}
        </select>
        {pendiente && (
          <span
            className="absolute right-8 size-3.5 animate-spin rounded-full border-[1.5px] border-borde border-t-acento"
            aria-hidden
          />
        )}
      </span>
    </label>
  );
}
