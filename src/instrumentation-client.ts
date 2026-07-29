import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_* se incrusta en el bundle en build time — sin esa variable
// configurada en Vercel, este archivo no llama a Sentry.init() y el resto
// del SDK queda inerte (no rompe nada, igual que el server).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
