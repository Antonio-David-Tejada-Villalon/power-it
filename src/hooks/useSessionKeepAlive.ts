"use client";

import { useEffect } from "react";

// El access token dura 15min (src/lib/auth/jwt.ts). Sin esto, nada en el
// cliente llama nunca a /api/auth/refresh — el endpoint existe y funciona,
// pero como no se usa, el token expira en medio de cualquier tarea larga
// (cargar un producto, completar un formulario) y el usuario queda
// deslogueado sin aviso al intentar guardar, aunque el refresh token (7
// días) siga siendo válido. Renovar cada 10min mantiene la sesión viva
// mientras la pestaña esté abierta, con margen de sobra bajo esos 15min.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function useSessionKeepAlive(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
