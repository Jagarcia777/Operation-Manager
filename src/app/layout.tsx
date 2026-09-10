import type { Metadata } from "next";
import { BarraLateral } from "@/components/BarraLateral";
import { prisma } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operation Manager",
  description: "Control de ventas y operaciones de la cadena",
};

// Todas las pantallas leen la base local en cada visita: nada se prerenderiza con data vieja.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const perfil = await prisma.perfil.findUnique({ where: { id: "maestro" } });

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <div className="flex min-h-dvh flex-col md:flex-row">
          <BarraLateral
            usuario={perfil?.nombre ?? "Usuario maestro"}
            cargo={perfil?.cargo ?? "Operaciones"}
          />
          <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-9">{children}</main>
        </div>
      </body>
    </html>
  );
}
