import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import type { MongoMemoryReplSet } from "mongodb-memory-server";

// Registra todos los modelos aunque la ruta que llama a connectDB() solo
// importe uno de ellos directamente (necesario para que populate() funcione
// sin depender del orden de imports de cada route handler).
import "@/models/User";
import { Category } from "@/models/Category";
import "@/models/Product";
import "@/models/Order";
import "@/models/AuditLog";
import "@/models/Settings";
import "@/models/UserEditRequest";
import "@/models/RateLimit";
import "@/models/Counter";
import "@/models/ExchangeRate";
import "@/models/Cart";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: MongoMemoryReplSet | null;
}

declare global {
  var __powerItMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__powerItMongooseCache ?? {
  conn: null,
  promise: null,
  memoryServer: null,
};
global.__powerItMongooseCache = cache;

async function resolveConnectionUri(): Promise<string> {
  const configuredUri = process.env.MONGODB_URI;
  if (configuredUri) return configuredUri;

  // Sin MONGODB_URI (aun no hay Atlas): levantamos un MongoDB real en local
  // vía mongodb-memory-server, como replica set de un solo nodo (con dbPath
  // persistente para no perder datos entre reinicios de `npm run dev`).
  // Necesita ser replica set (no standalone) porque Atlas SIEMPRE despliega
  // como replica set —incluso el tier M0 gratuito— y las transacciones
  // multi-documento de src/lib/inventory.ts solo funcionan contra uno.
  const { MongoMemoryReplSet } = await import("mongodb-memory-server");
  const dbPath = path.join(process.cwd(), ".data", "mongo");
  fs.mkdirSync(dbPath, { recursive: true });

  const replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ dbPath, port: 27117 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  cache.memoryServer = replSet;

  const uri = replSet.getUri("powerit");
  console.log(`[db] MongoDB local (replica set de 1 nodo, mongodb-memory-server) listo en ${uri}`);
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveConnectionUri()
      .then((uri) => mongoose.connect(uri, { bufferCommands: false }))
      .then(async (conn) => {
        // El índice único de `slug` en Category pasó de ser global a
        // (parent, slug) para permitir nombres repetidos en ramas distintas
        // (ej. "Hogar" bajo Notebooks y bajo PC de Escritorio) — Mongoose
        // crea el índice nuevo solo, pero nunca borra el viejo de un solo
        // campo. Corre una sola vez por conexión (no por request), así que
        // es seguro incluso contra la base de producción ya en uso.
        await Category.syncIndexes();
        return conn;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

/** Solo para scripts standalone (ej. scripts/seed.ts): cierra la conexión
 * y detiene mongodb-memory-server para no dejar procesos huérfanos. */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (cache.memoryServer) {
    await cache.memoryServer.stop();
    cache.memoryServer = null;
  }
  cache.conn = null;
  cache.promise = null;
}
