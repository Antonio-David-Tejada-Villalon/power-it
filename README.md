# Power IT

Catálogo + panel administrativo de tecnología (Next.js 16 + MongoDB/Mongoose).

Para el estado completo del proyecto, arquitectura, roles, credenciales de prueba y limitaciones conocidas, ver **[ESTADO_PROYECTO.md](./ESTADO_PROYECTO.md)** — ese es el documento de referencia, no este README.

## Inicio rápido

```bash
npm install
npm run dev     # levanta Mongo local automático (mongodb-memory-server) + Next en :3000
npm run seed    # puebla categorías, productos y usuarios de prueba
```

Producción: [power-it-one.vercel.app](https://power-it-one.vercel.app) (Vercel + MongoDB Atlas). Local y producción usan bases de datos **separadas** — ver la sección correspondiente en `ESTADO_PROYECTO.md` antes de tocar `MONGODB_URI`.
