import * as Sentry from "@sentry/nextjs";

// Scaffolded como Google OAuth: sin SENTRY_DSN configurado, Sentry.init()
// simplemente no se llama y captureRequestError() se convierte en un no-op
// (no hay cliente activo) — no rompe nada ni ensucia la consola.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

export const onRequestError = Sentry.captureRequestError;
