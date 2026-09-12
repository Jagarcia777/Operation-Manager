import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Operation Manager",
    template: "%s · Operation Manager",
  },
  description: "Control de ventas y operaciones de la cadena",
  applicationName: "Operation Manager",
  // La data es sensible: no queremos esto indexado ni resumido por nadie.
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: {
    capable: true,
    title: "Operation Manager",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // El color de la barra del navegador en móvil, para que la aplicación no quede
  // enmarcada en blanco cuando el teléfono está en oscuro.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
