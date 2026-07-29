"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientUser } from "@/lib/types";

const SessionContext = createContext<ClientUser | null>(null);

// El usuario actual ya lo resuelve DashboardLayout (server component) antes
// de montar el árbol del dashboard — este contexto solo lo redistribuye para
// que ningún componente cliente tenga que volver a pedirlo por su cuenta.
export function SessionProvider({ user, children }: { user: ClientUser; children: ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientUser {
  const user = useContext(SessionContext);
  if (!user) {
    throw new Error("useSession() solo puede usarse dentro de un SessionProvider (dashboard)");
  }
  return user;
}
