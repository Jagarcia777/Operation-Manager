import type { NextConfig } from "next";

// La aplicación maneja información sensible del negocio y corre en el equipo del usuario.
// Estas cabeceras evitan que la interfaz se embeba, se rastree o cargue recursos de terceros.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Los formularios aceptan 1 MB por defecto, y un Dashboard Ejecutivo en PDF o una foto
    // del tablero pasan de eso con facilidad. Se sube al máximo que admite la plataforma
    // serverless (4,5 MB de petición), dejando margen para el resto del formulario.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
