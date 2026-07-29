"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// global-error reemplaza todo el root layout cuando se dispara, así que no
// llegan los estilos globales ni el ThemeProvider — por eso va con estilos
// inline en vez de clases de Tailwind (ver nota de Next.js sobre esto).
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          color: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Ya quedó registrado. Podés intentar de nuevo o volver más tarde.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              background: "#0ea5e9",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
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
