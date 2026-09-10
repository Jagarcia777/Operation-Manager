import { BarraLateral } from "@/components/BarraLateral";
import { prisma } from "@/lib/db";

export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const perfil = await prisma.perfil.findUnique({ where: { id: "maestro" } });

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <BarraLateral
        usuario={perfil?.nombre ?? "Usuario maestro"}
        cargo={perfil?.cargo ?? "Operaciones"}
        marca={perfil?.marca || "Operation Manager"}
        iniciales={perfil?.iniciales || "OM"}
      />
      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-9">{children}</main>
    </div>
  );
}
