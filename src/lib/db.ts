import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import type { MongoMemoryServer } from "mongodb-memory-server";

// Registra todos los modelos aunque la ruta que llama a connectDB() solo
// importe uno de ellos directamente (necesario para que populate() funcione
// sin depender del orden de imports de cada route handler).
import "@/models/User";
import "@/models/Category";
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
  memoryServer: MongoMemoryServer | null;
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
  // via mongodb-memory-server, con dbPath persistente para no perder datos
  // entre reinicios de `npm run dev`.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = path.join(process.cwd(), ".data", "mongo");
  fs.mkdirSync(dbPath, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger",
      port: 27117,
    },
  });
  cache.memoryServer = mongod;

  const uri = `${mongod.getUri()}powerit`;
  console.log(`[db] MongoDB local (mongodb-memory-server) listo en ${uri}`);
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveConnectionUri().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false })
    );
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
