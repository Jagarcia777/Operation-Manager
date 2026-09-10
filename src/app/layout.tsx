import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operation Manager",
  description: "Control de ventas y operaciones de la cadena",
};

// Todas las pantallas leen la base en cada visita: nada se prerenderiza con data vieja.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
