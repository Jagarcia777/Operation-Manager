import Link from "next/link";

export type Pestana = { href: string; etiqueta: string; activa: boolean };

export function Pestanas({ pestanas }: { pestanas: Pestana[] }) {
  return (
    <nav className="no-imprimir flex gap-1 overflow-x-auto border-b border-borde-suave">
      {pestanas.map((pestana) => (
        <Link
          key={pestana.href}
          href={pestana.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200 ${
            pestana.activa
              ? "border-acento font-medium text-acento"
              : "border-transparent text-texto-2 hover:text-texto"
          }`}
        >
          {pestana.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
