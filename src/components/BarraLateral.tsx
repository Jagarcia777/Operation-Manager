"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "@/app/entrar/acciones";
import { Monograma } from "@/components/Monograma";

const GRUPOS = [
  {
    titulo: "Operación",
    secciones: [
      { href: "/", etiqueta: "Inicio", icono: "inicio" },
      { href: "/tablero", etiqueta: "Tablero", icono: "tablero" },
      { href: "/categorias", etiqueta: "Categorías", icono: "categorias" },
      { href: "/ajustes", etiqueta: "Ajustes", icono: "ajustes" },
      { href: "/alertas", etiqueta: "Alertas", icono: "alertas" },
    ],
  },
  {
    titulo: "Decisión",
    secciones: [
      { href: "/analisis", etiqueta: "Análisis", icono: "analisis" },
      { href: "/planes", etiqueta: "Planes de acción", icono: "planes" },
      { href: "/documentos", etiqueta: "Documentos", icono: "documentos" },
    ],
  },
  {
    titulo: "Datos",
    secciones: [
      { href: "/cargar", etiqueta: "Cargar datos", icono: "cargar" },
      { href: "/configuracion", etiqueta: "Configuración", icono: "configuracion" },
    ],
  },
] as const;

const TRAZOS: Record<string, string> = {
  inicio: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1z",
  tablero: "M3 16V8m4.5 8V4M12 16v-5m4.5 5V6",
  ajustes: "M3 6h14M3 10h14M3 14h9",
  alertas: "M10 3.5 17.5 16.5H2.5zM10 8.5v3.5M10 14.5h.01",
  analisis: "M3.5 13.5 8 9l3 3 5.5-6M12 6h4.5v4.5",
  categorias: "M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z",
  planes: "M6 4h8a1 1 0 0 1 1 1v11l-5-2.5L5 16V5a1 1 0 0 1 1-1z",
  documentos: "M5 3h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 3v4h4",
  cargar: "M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M3.5 13v3h13v-3",
  configuracion: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2",
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
      aria-hidden
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

export function BarraLateral({
  usuario,
  cargo,
  marca,
  iniciales,
}: {
  usuario: string;
  cargo: string;
  marca: string;
  iniciales: string;
}) {
  const ruta = usePathname();

  return (
    <nav className="no-imprimir flex shrink-0 gap-1 overflow-x-auto border-b border-borde-suave bg-superficie px-3 py-2 md:h-dvh md:w-60 md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-5">
      <div className="hidden items-center gap-2.5 px-3 pb-5 md:flex">
        <Monograma iniciales={iniciales} tamano={34} />
        <div className="min-w-0">
          {/* Dos líneas antes que un truncado: "Operation Mana…" en la cabecera de la
              aplicación es lo primero que se ve y lo primero que resta. */}
          <p className="text-[15px] leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {marca}
          </p>
          <p className="truncate text-xs text-texto-3">Control de operaciones</p>
        </div>
      </div>

      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="contents md:mb-3 md:block">
          <p className="hidden px-3 pb-1 text-[11px] font-medium tracking-wide text-texto-3 uppercase md:block">
            {grupo.titulo}
          </p>
          {grupo.secciones.map((seccion) => {
            const activa =
              seccion.href === "/" ? ruta === "/" : ruta.startsWith(seccion.href);
            return (
              <Link
                key={seccion.href}
                href={seccion.href}
                aria-current={activa ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200 ${
                  activa
                    ? "bg-acento-tenue font-medium text-acento"
                    : "text-texto-2 hover:bg-superficie-3 hover:text-texto"
                }`}
              >
                <Icono nombre={seccion.icono} />
                {seccion.etiqueta}
              </Link>
            );
          })}
        </div>
      ))}

      {/* En móvil la barra es una fila que se desplaza, así que salir va al final de esa fila:
          antes el bloque llevaba `hidden md:block` y desde el teléfono no había forma de cerrar
          la sesión. En escritorio se queda abajo, con el nombre encima. */}
      <div className="mt-auto flex shrink-0 items-center gap-2 md:block md:border-t md:border-borde-suave md:px-3 md:pt-4">
        <div className="hidden md:block">
          <p className="text-sm font-medium">{usuario}</p>
          <p className="text-xs text-texto-3">{cargo}</p>
        </div>
        <form action={salir} className="md:mt-2.5">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-texto-2 transition-colors duration-200 hover:bg-alerta-tenue hover:text-alerta md:w-full md:justify-start md:border md:border-borde-suave md:py-1.5"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-[18px] shrink-0"
              aria-hidden
            >
              <path d="M12.5 6V4.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14M9 10h7.5m0 0-2.5-2.5M16.5 10 14 12.5" />
            </svg>
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  );
}
