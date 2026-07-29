import { RateLimit } from "@/models/RateLimit";

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  limited: boolean;
  count: number;
  retryAfterSeconds: number;
}

/**
 * Contador de ventana fija respaldado por Mongo (no requiere Redis ni estado
 * en memoria, así que funciona igual en local, en múltiples instancias
 * serverless de Vercel, o entre reinicios). `key` identifica lo que se
 * limita (ej. `login:email:<email>`); el bucket de tiempo se agrega acá
 * adentro para que el incremento sea una única operación atómica.
 */
export async function checkRateLimit(key: string, { windowMs, max }: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const bucketKey = `${key}:${bucket}`;
  const bucketEnd = (bucket + 1) * windowMs;

  const doc = await RateLimit.findOneAndUpdate(
    { key: bucketKey },
    {
      $inc: { count: 1 },
      // +5s de margen sobre el cierre de la ventana: el barrido del índice
      // TTL de Mongo no es instantáneo, este margen evita que se borre el
      // documento un instante antes de que la ventana termine de verdad.
      $setOnInsert: { expiresAt: new Date(bucketEnd + 5000) },
    },
    { upsert: true, new: true }
  );

  return {
    limited: doc.count > max,
    count: doc.count,
    retryAfterSeconds: Math.max(1, Math.ceil((bucketEnd - now) / 1000)),
  };
}
