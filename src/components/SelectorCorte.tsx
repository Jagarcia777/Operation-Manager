"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Opcion = { id: string; nombre: string };

export function SelectorCorte({ cortes, actual }: { cortes: Opcion[]; actual: string }) {
  const router = useRouter();
  const parametros = useSearchParams();

  return (
    <label className="no-imprimir flex items-center gap-2 text-sm text-texto-2">
      Corte
      <select
        className="campo w-auto min-w-52"
        value={actual}
        onChange={(evento) => {
          const siguientes = new URLSearchParams(parametros);
          siguientes.set("corte", evento.target.value);
          router.push(`?${siguientes.toString()}`);
        }}
      >
        {cortes.map((corte) => (
          <option key={corte.id} value={corte.id}>
            {corte.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
