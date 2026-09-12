"use client";

/**
 * Último recurso: si falla el layout raíz, este componente reemplaza el documento entero,
 * así que va con sus propios estilos en línea — a esa altura la hoja de estilos puede no
 * haber cargado.
 */
export default function ErrorGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f5f7",
          color: "#1d1d1f",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            La aplicación no pudo arrancar
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, color: "#6e6e73", lineHeight: 1.5 }}>
            Vuelve a cargar la página. Si sigue igual, es un problema del servidor y no de
            tus datos.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 22px",
              borderRadius: 980,
              border: 0,
              background: "#0071e3",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
