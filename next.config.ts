import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Sin nonces a propósito: el nonce-based CSP de Next fuerza renderizado
// dinámico en todas las páginas (pierde la optimización estática). Con el
// tamaño actual del sitio, 'unsafe-inline' es el trade-off correcto — sigue
// bloqueando scripts/estilos inyectados desde un origen externo, que es el
// vector real que interesa cortar.
// img-src abierto a cualquier https: los admins pueden cargar la imagen de un
// producto desde cualquier URL. Esas imágenes se renderizan con next/image en
// modo "unoptimized" (el servidor nunca las descarga ni las procesa), así que
// esto no reabre el riesgo de SSRF/DoS del optimizador de imágenes de Next
// contra un host arbitrario.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
