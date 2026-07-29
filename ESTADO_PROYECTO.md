# Power IT — Estado del proyecto

> Documento de referencia para retomar el trabajo en una sesión nueva de Claude Code (o para cualquiera que se sume al proyecto). Última actualización: ver historial de git / fecha de este archivo.

## Qué es esto

Catálogo + panel administrativo de **Power IT** (tienda de tecnología). Arrancó como una plantilla de "Librería Reyna Domínguez" (catálogo de libros sin backend) y se reconvirtió por completo a una plataforma MERN con roles, pedidos, stock, auditoría y analíticas.

## Stack

- **Next.js 16** (App Router). Ojo: esta versión tiene cambios respecto a lo habitual — `middleware.ts` está deprecado y renombrado a **`proxy.ts`** (export `proxy`, no `middleware`), `params` en rutas dinámicas es `Promise<{...}>`, `cookies()`/`headers()` son async. Antes de tocar routing/middleware, revisar `node_modules/next/dist/docs/` (así lo pide `AGENTS.md`).
- **MongoDB vía Mongoose**. En desarrollo NO hace falta instalar Mongo ni Docker: `src/lib/db.ts` levanta automáticamente un Mongo real con `mongodb-memory-server` (persistido en `.data/mongo`, gitignored) si `MONGODB_URI` está vacío. Se levanta como **replica set de un solo nodo**, no standalone — así soporta transacciones ACID reales (ver `src/lib/inventory.ts`) con la misma topología que Atlas (que despliega siempre como replica set, incluso el tier M0 gratuito). Para producción, poner la connection string de Atlas en `MONGODB_URI`.
- **TypeScript, Tailwind CSS 4, Framer Motion, lucide-react**.
- **Auth propia**: JWT (`jose`) en cookies httpOnly (`pit_at` 15min / `pit_rt` 7 días), hashing con `bcryptjs`. RBAC por `role` + `permissions[]` (no solo el string de rol).
- **Roles**: `admin`, `supervisor`, `encargado`, `operario`, `cliente`. Jerarquía de staff: admin → supervisor → encargado → operario (`src/lib/auth/hierarchy.ts`). `cliente` es externo, fuera de esta cadena.

## Cómo correrlo

```bash
npm install
npm run dev     # levanta Mongo local automático + Next en :3000
npm run seed     # puebla categorías, ~21 productos y usuarios de prueba
npm test         # corre la suite de Vitest (hierarchy.ts + inventory.ts + orderLinking.ts)
```

Credenciales sembradas por `npm run seed`:

| Rol | Email | Password |
|---|---|---|
| admin | admin@powerit.local | PowerIT#2026 |
| supervisor | supervisor@powerit.local | Supervisor#2026 |
| encargado | encargado@powerit.local | Encargado#2026 |
| operario | operario@powerit.local | Operario#2026 |
| cliente | cliente@powerit.local | Cliente#2026 |

`npx tsc --noEmit` y `npx eslint .` deben quedar sin errores antes de dar por terminado cualquier cambio (así se validó todo lo construido hasta ahora). Desde QA-03, `npm install` deja instalado un hook de `pre-commit` (husky) que corre ambos automáticamente antes de dejar commitear — si falla, el commit no se crea.

## Local vs. producción: son bases de datos distintas

`npm run dev` en tu máquina usa **su propia base local** (`mongodb-memory-server`, persistida en `.data/mongo`, nunca sale de tu disco). Vercel/producción usa **MongoDB Atlas**. Son dos copias de datos completamente independientes:

- Editar un producto (o cualquier dato) en el admin de `localhost:3000` **no se refleja** en `power-it-one.vercel.app`, y viceversa.
- Para cambiar algo en el sitio real hay que loguearse en el dashboard de la URL de producción, no en local.
- `git push` / el deploy de Vercel **nunca tocan la base de datos**: `next build` (el comando de build que usa Vercel) solo compila código, no ejecuta `scripts/seed.ts` ni ninguna migración. Los únicos que escriben en Mongo son (a) el uso real del sitio (pedidos, ediciones desde el dashboard) y (b) correr `npm run seed` a mano.
- `scripts/seed.ts` tiene una traba de seguridad: si `MONGODB_URI` apunta a algo que no sea local (ej. Atlas), se niega a correr salvo que se agregue `SEED_CONFIRM=yes` explícitamente — así un `npm run seed` corrido sin querer con la variable de Atlas todavía exportada no pisa el catálogo real por accidente.
- Los cambios de esquema (Mongoose) son aditivos y retrocompatibles: agregar un campo nuevo con `default` (ej. `canApproveOwnEdits`) o un valor nuevo de enum (ej. el rol `operario`) no reescribe ni rompe los documentos viejos en Atlas — Mongoose aplica el default al leerlos. El único riesgo real al shippear una función nueva es el de siempre en cualquier software: si tiene un bug y alguien la usa en el sitio real, ese uso podría escribir un dato mal — por eso toda función nueva se valida con `tsc`/`eslint` y se prueba a mano (API o navegador) antes de darla por terminada.

## Estructura clave

```
src/
  proxy.ts                     # RBAC de rutas /dashboard, /mi-cuenta, /api (reemplaza middleware.ts)
  models/                      # User, Product, Category, Order, AuditLog, Settings, UserEditRequest, RateLimit, Counter, ExchangeRate, Cart
  lib/
    db.ts                      # conexión Mongo (singleton + mongodb-memory-server)
    auth/                      # jwt, password, permissions, session, guard (RBAC helpers)
    auth/hierarchy.ts           # manageableRoles/directManagerRole/canReviewRequest (jerarquía de aprobaciones)
    inventory.ts                # reserveStock/releaseStock (reserva de stock de pedidos)
    productImportExport.ts, summaryExport.ts, auditExport.ts, exportUtils.ts  # exports a Excel/PDF
  app/
    (public)/page.tsx          # catálogo público (sidebar categorías + filtros dinámicos)
    (auth)/{login,registro}
    (account)/mi-cuenta/pedidos
    dashboard/perfil            # "Mi perfil" compartido por todos los roles de staff
    dashboard/{admin,supervisor,encargado,operario}/...  # incluye usuarios/ y solicitudes/ por rol
    api/user-requests/...       # listar y revisar (aprobar/rechazar/eliminar) solicitudes de edición
    api/...                    # backend (route handlers)
  components/
    catalog/                   # ProductCard, CategorySidebar, CheckoutOptionsModal, DeveloperCredit, etc.
    dashboard/                 # ProductsTable, OrdersTable, CategoriesManager, RequestsManager, ProfileForm, etc.
    ui/                        # ConfirmDialog, ReasonDialog, HelpPopover, DateRangePicker, DataTable, Logo, etc.
```

## Auditoría de seguridad (28 jul 2026) — mitigaciones aplicadas

Se hizo una auditoría integral (arquitectura/seguridad/datos/UX/infra/calidad/negocio) de solo lectura. Los tres hallazgos de mayor severidad ya se resolvieron:

- **Rate limiting en login** (`src/lib/auth/rateLimit.ts` + `src/models/RateLimit.ts`): contador de ventana fija respaldado en Mongo con TTL, sin dependencias nuevas. Máx. 8 intentos/15min por email y 30/15min por IP; devuelve 429 + `Retry-After`.
- **Revocación de sesión al cambiar contraseña**: `refreshTokenVersion` ahora se incrementa (`$inc`) en `PATCH /api/users/[id]` (admin directo) y al aprobar una `UserEditRequest` con contraseña — antes existía el campo pero nunca se tocaba, así que un refresh token robado seguía siendo válido después de cambiar la clave.
- **Cabeceras de seguridad HTTP** (`next.config.ts` → `headers()`): CSP (sin nonces, `'unsafe-inline'` deliberado para no forzar renderizado dinámico en todo el sitio), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS. Verificado con Playwright en catálogo público, login y todo el dashboard admin sin ninguna violación de CSP en consola.
- **Variables de entorno de producción fuera de "Preview"**: `MONGODB_URI`, `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` en Vercel quedaron con scope solo `Production` (antes también incluían `Preview`, lo que habría hecho que un futuro PR/preview deploy leyera y escribiera sobre la base de datos real). Cambio hecho a mano en el dashboard de Vercel, no es código.
- **CI mínimo** (`.github/workflows/ci.yml`): corre `npx tsc --noEmit` y `npx eslint .` en cada push/PR a `main`. Antes nada impedía que un error de tipos o de lint llegara a producción; ahora al menos ese gate es automático, no depende de que alguien se acuerde de correrlo a mano.
- **Contador atómico de pedidos** (`src/lib/orderNumber.ts` + `src/models/Counter.ts`): `nextOrderNumber()` ya no cuenta documentos (`Order.countDocuments()+1`, con condición de carrera bajo checkouts simultáneos); ahora usa un `$inc` atómico sobre un contador dedicado, con bootstrap automático que arranca la secuencia después del último pedido ya existente. Probado con 15 creaciones de pedido verdaderamente concurrentes (`Promise.all`): 15 números únicos, sin colisiones ni duplicados.
- **Next.js actualizado 16.2.4 → 16.2.12**: `npm audit` (no se había corrido en la auditoría original) encontró varias vulnerabilidades altas en Next.js ya parcheadas en 16.2.12, incluyendo *bypasses de Middleware/Proxy* — el mecanismo exacto de `src/proxy.ts`. Actualizado y verificado (RBAC sigue devolviendo 401/307/200 como corresponde). `postcss`/`sharp` quedan como riesgo residual aceptado: vienen empaquetados dentro de Next.js mismo, y la única "corrección" que ofrece `npm audit --force` es degradar a Next 9 (rompería todo el proyecto) — se resuelven solos con futuros parches de Next, no hay acción propia posible hoy.
- **Primeros tests automatizados** (Vitest, `npm test`): antes no existía ningún test en el proyecto. Se agregó cobertura de la lógica más crítica: `src/lib/auth/hierarchy.test.ts` (incluye como test de regresión permanente un bug real que se encontró y corrigió en esta misma sesión: el privilegio de autoaprobación de un supervisor no debe aplicar cuando edita a un subordinado) y `src/lib/inventory.test.ts` (reserva/liberación de stock, con un test de concurrencia real contra Mongo que confirma que nunca se vende de más). El paso `npm test` ya forma parte de `.github/workflows/ci.yml`.

- **Secretos JWT con fail-fast en producción** (`src/lib/auth/jwt.ts`): antes, si `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` faltaban o quedaban en el valor de desarrollo (`dev-*-secret-change-me`, visible en el repo público), la app firmaba/verificaba tokens en silencio con ese secreto predecible. Ahora, si `NODE_ENV==='production'` y el secreto falta o coincide con el default, lanza un error explícito en vez de operar de forma insegura. Probado en los 4 escenarios (dev normal, prod sin secreto, prod con el default, prod con secreto real) — solo falla cuando corresponde. Producción en Vercel ya tiene secretos reales configurados, así que este cambio no afecta el funcionamiento actual.

- **Accesibilidad — motion + foco** (UX-01/UX-02): `MotionConfig reducedMotion="user"` en `ThemeProvider.tsx` hace que framer-motion respete automáticamente `prefers-reduced-motion` del sistema en toda la app; sumado a un `@media (prefers-reduced-motion: reduce)` en `globals.css` para transiciones CSS puras. Se agregó un enlace "Saltar al contenido principal" (oculto hasta recibir foco por teclado) apuntando a `#main-content` en el catálogo público y en todo el dashboard, y un `:focus-visible` consistente con la marca (antes dependía del outline por defecto del navegador, poco visible sobre las superficies "glass" oscuras). Verificado con Playwright: el skip-link aparece correctamente al tabular, y la app no rompe con `prefers-reduced-motion: reduce` emulado.

- **`xlsx` actualizado a la versión parchada de SheetJS** (SEC-06): las versiones post-0.18 ya no se publican en el registro de npm, solo en el CDN oficial de SheetJS. Se evaluó migrar a `exceljs` primero, pero **se descartó**: trae su propia cadena de dependencias (`archiver` → `glob`/`minimatch`/`brace-expansion`, `uuid`) con vulnerabilidades altas nuevas (DoS, buffer bounds) — no era una mejora neta, solo cambiaba qué estaba roto. En cambio, se instaló `xlsx` directo desde la URL versionada y pinneada del CDN oficial (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` en `package.json`, no la etiqueta flotante `latest`): mismo API, cero dependencias nuevas, y el advisory de `xlsx` desaparece de `npm audit`. Probado con un roundtrip real (generar → leer → comparar) idéntico al usado en `productImportExport.ts`/`auditExport.ts`/`summaryExport.ts`.

Pendiente del plan original: `dompurify` desactualizado (vía `jspdf`, moderado — sin fix directo disponible hoy). Ver el informe completo si se necesita retomar eso.

### Puntos de negocio (BIZ-01/02) — decididos

- **BIZ-01 (sin cambios, decisión confirmada)**: el "checkout" del catálogo sigue siendo una solicitud de presupuesto (recolecta datos y genera un pedido para seguimiento manual del staff), no un cobro con pasarela de pago — es el modelo de negocio intencional (venta B2B por cotización), con cobro por un método externo al sistema. Una pasarela de pago real queda como posible trabajo futuro, a decidir más adelante.
- **BIZ-02 (construido)**: ver la sección siguiente.

## Reconocimiento de cliente recurrente / carrito guardado (BIZ-02, 29 jul 2026)

- **Vínculo automático de pedidos de invitado a la cuenta** (`src/lib/orderLinking.ts` → `linkGuestOrdersToUser`): al hacer login, registrarse o entrar con Google, si el usuario es `cliente`, se buscan pedidos previos hechos como invitado (`customer.user: null`) con el mismo email (match case-insensitive vía `collation`, no regex) y se les asigna `customer.user` a la cuenta recién identificada. Así, alguien que compró sin loguearse y después crea cuenta con el mismo email ve automáticamente ese pedido en "Mis pedidos" — sin pedirle nada extra. Enganchado en `POST /api/auth/login`, `POST /api/auth/register` y `GET /api/auth/google/callback`.
- **Carrito guardado del lado del servidor** (`src/models/Cart.ts` + `GET`/`PUT /api/cart`): un cliente logueado tiene su carrito persistido en Mongo (uno por usuario), no solo en `localStorage` del navegador. `useCart.syncWithAccount(userId)` se llama una vez detectada la sesión (en el efecto de `/api/auth/me` del catálogo público) y combina el carrito del servidor con el local sumando cantidades de productos en común — así un cliente que agrega productos desde el celular y después entra desde la computadora (o borra el navegador) encuentra su carrito intacto. Cada cambio al carrito de un usuario sincronizado se persiste al servidor en el mismo efecto que ya guardaba en `localStorage` (best-effort, no bloquea la UI si falla la red).
- **Enlace "Mis pedidos" en el catálogo público**: antes un cliente logueado no tenía forma de llegar a `/mi-cuenta/pedidos` desde el header del catálogo (ese link solo existía para roles de staff, hacia `/dashboard`). Ahora, si el usuario logueado es `cliente`, el header muestra "Mis pedidos" en su lugar.
- No se resucitó el sistema de notificación por email/WhatsApp revertido anteriormente (ver nota más abajo) — esta solución no depende de ninguna integración externa nueva.
- Probado con Playwright de punta a punta: (1) pedido de invitado confirmado con un email de prueba → registro de cuenta con ese mismo email → el pedido aparece en "Mis pedidos" (1 fila, antes 0 sin este cambio); (2) login con una cuenta existente → agregar un producto al carrito (confirmado que `PUT /api/cart` lo persiste) → `localStorage` borrado y página recargada simulando "otro dispositivo" → el carrito reaparece con el mismo producto (badge del carrito en 1). Datos de prueba eliminados de la base local al terminar.

## Imágenes de cualquier URL + multi-moneda (29 jul 2026)

- **Imágenes de producto desde cualquier URL** (`src/lib/utils.ts` → `isImageUrl`): antes solo `images.unsplash.com` funcionaba (restricción de `next/image`). Ahora se acepta cualquier host, siempre que la URL sea `https` y termine en `.jpg/.jpeg/.png/.gif/.webp/.avif/.svg` (validado con Zod en `POST`/`PATCH /api/products` y en la importación masiva). Las imágenes de producto se renderizan con `next/image` en modo `unoptimized` (`ProductCard`, `ProductDetailModal`, `CartSidebar`, `ProductsTable`, `TopProductsRanking`) — el servidor nunca descarga ni procesa la imagen, así que no reabre el riesgo de SSRF/DoS del optimizador de Next contra un host arbitrario (ver SEC-02 en la auditoría). CSP `img-src` ampliado a cualquier `https:`. De yapa, esto arregló que un producto de prueba viejo ("probando imagen", con una imagen en `i.ibb.co`) rompiera el catálogo público en local.
- **Moneda por producto** (`src/lib/currency.ts`, campo `currency` en `Product`): al cargar/editar un producto se elige entre ARS, USD, UYU, EUR o BRL (`CURRENCIES`). Default `"USD"` para no reinterpretar productos ya cargados. La plantilla de importación masiva tiene una columna `Moneda` (opcional, default USD).
- **Conversión automática por ubicación del visitante** (`src/app/api/currency/route.ts` + `src/lib/exchangeRates.ts`): en el catálogo público, cada producto muestra su precio convertido a la moneda del país del visitante (detectado gratis vía la cabecera `x-vercel-ip-country` de Vercel, sin pedir permisos ni login), con el precio original como referencia debajo ("≈ ... precio de referencia, puede variar"). Los tipos de cambio se obtienen de `open.er-api.com` (gratis, sin API key) y se cachean en Mongo (`ExchangeRate`) por 1 hora para no golpear la API en cada visita; si la API falla, se usa la última tasa cacheada o un valor aproximado fijo. En local, `x-vercel-ip-country` no existe — se puede simular con la variable de entorno `DEV_GEO_COUNTRY` (ej. `DEV_GEO_COUNTRY=AR npm run dev`), y sin nada seteado cae a USD.
- **Un pedido no mezcla monedas**: `useCart` rechaza agregar un producto de una moneda distinta a la que ya está en el carrito (mensaje claro, no falla en silencio); `POST /api/orders` valida lo mismo server-side y guarda `order.currency`. El checkout/carrito siempre muestra la moneda real del pedido, nunca la convertida (la conversión es solo una ayuda de referencia en el catálogo, no lo que se factura).
- **KPIs y ranking de productos ahora sí sopesan multi-moneda**: `/api/dashboard/kpis` y `/api/dashboard/top-products` agrupan por moneda y convierten todo a USD (moneda de referencia del dashboard) antes de sumar — antes sumaban `$total`/`$subtotal` crudos, lo que habría dado un número sin sentido apenas hubiera pedidos en más de una moneda. Los labels de KPI ahora dicen explícitamente "(USD)".
- Probado en vivo: producto ARS con imagen `i.ibb.co` creado y mostrado con precio convertido a USD; bloqueo de mezcla de monedas en el carrito (capturado en pantalla); pedido creado con `currency:"ARS"`; KPIs recalculados correctamente sumando un pedido ARS + pedidos USD existentes sin romperse.

## Segunda ronda de la auditoría — 5 hallazgos más resueltos (29 jul 2026)

- **SEC-05 — política de contraseñas** (`src/lib/auth/password.ts` → `PasswordSchema`): antes la única regla era longitud ≥ 8. Ahora exige además combinar letras y números, y rechaza una lista corta de las contraseñas más comunes (`password`, `12345678`, `contraseña`, etc.). Un único schema de Zod reutilizado en registro, alta de usuario de staff y edición de perfil/usuario (`/api/auth/register`, `/api/users`, `/api/users/[id]`), así que no hay reglas divergentes entre esos tres caminos. Los tres endpoints ahora devuelven el mensaje específico de Zod en vez de un genérico "datos inválidos", y los formularios muestran un hint de "mínimo 8 caracteres, combinando letras y números".
- **DEV-02 — filtros de Mongo tipados**: `/api/orders` y `/api/products` armaban el query de Mongoose como `Record<string, unknown>` suelto. Ahora usan `QueryFilter<OrderDoc>`/`QueryFilter<ProductDoc>` (el tipo de mongoose 9 — reemplazó a `FilterQuery` de versiones anteriores), así que agregar a futuro un campo que no exista en el schema lo atrapa el compilador, no un bug en producción.
- **DEV-01 — sesión del actor compartida en el dashboard** (`src/components/dashboard/SessionContext.tsx`, nuevo): `UserEditForm`, `UsersManager` y `ProfileForm` hacían cada uno su propio `fetch("/api/auth/me")` al montar. Ahora `DashboardShell` (que ya recibe el usuario resuelto server-side desde `DashboardLayout`) lo redistribuye vía un `SessionProvider`/`useSession()` de React Context — una sola fuente de verdad, sin llamadas de red duplicadas ni riesgo de que dos componentes queden desincronizados.
- **QA-02 — el catálogo público ya no pierde productos más allá de 100**: `GET /api/products` sigue limitando a 100 ítems por página (protección razonable del lado del servidor), pero el catálogo público ahora pagina automáticamente contra el servidor (`loadProducts` en `page.tsx`) hasta traer el listado completo (tope de seguridad: 20 páginas = 2000 productos) antes de aplicar el buscador/filtros en memoria — antes, un catálogo de más de 100 productos hacía que los productos 101 en adelante desaparecieran en silencio de la búsqueda y los filtros.
- **DATA-01 — transacciones ACID reales para la reserva de stock** (el cambio más grande de esta ronda): se confirmó que el cluster de producción es Atlas M0, y **Atlas siempre despliega como replica set, incluso en el tier gratuito** — así que las transacciones multi-documento sí están disponibles, no hacía falta ningún upgrade de plan. `src/lib/inventory.ts` (`reserveStock`/`releaseStock`) se reescribió para usar `mongoose.startSession()` + `session.withTransaction()` en vez de `$inc` atómico por ítem con reversión manual — ahora si un ítem falla por stock insuficiente, la transacción entera se aborta y ningún producto queda afectado, sin ninguna ventana de inconsistencia intermedia. Para que el entorno local tenga la misma topología (necesaria para poder usar sesiones/transacciones), `src/lib/db.ts` levanta `mongodb-memory-server` como **replica set de un solo nodo** en vez de standalone — mismo `dbPath` persistente de siempre, los datos ya sembrados migraron sin tocarlos. Probado en vivo con Playwright: pedido real hecho de punta a punta, stock del producto descontado correctamente por la transacción (15→14). `src/lib/inventory.test.ts` también migró a `MongoMemoryReplSet` (los tests de concurrencia y reversión parcial siguen pasando, ahora contra transacciones reales en vez de la reversión manual).

## Monitoreo de errores con Sentry (INFRA-03, 29 jul 2026)

- **Scaffolded igual que Google OAuth**: se instaló `@sentry/nextjs` y se cableó en los tres puntos que pide el SDK — `src/instrumentation.ts` (servidor/edge, `register()` + `onRequestError` para errores no capturados de rutas/render), `src/instrumentation-client.ts` (navegador) y `src/app/global-error.tsx` (boundary de errores del root layout, con `unstable_retry` — la API de esta versión de Next.js, no el `reset` de versiones anteriores). Sin `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` configuradas, ninguno llama a `Sentry.init()` y el resto del SDK queda inerte (no rompe nada, no ensucia la consola) — falta que el usuario cree un proyecto en sentry.io y pegue el DSN en Vercel para activarlo del todo (ver sección de credenciales pendientes).
- **`handleApiError`** (`src/lib/auth/guard.ts`, usado por la mayoría de las rutas de API) ahora manda a Sentry cualquier error que no sea un `ApiAuthError` ni un duplicate-key de Mongo — es decir, exactamente los errores "de verdad" que antes solo quedaban como una línea de `console.error` sin que nadie se enterara. Las seis rutas que manejan sus propios catch en vez de pasar por `handleApiError` (`auth/register`, `auth/login`, `auth/refresh`, `auth/google/callback`, `orders` POST) también mandan a Sentry junto a su `console.error` existente.
- **CSP actualizada**: `connect-src` en `next.config.ts` ahora incluye los hosts de ingesta de Sentry (`*.ingest.sentry.io`, `*.ingest.us.sentry.io`, `*.ingest.de.sentry.io`, cubriendo sus tres regiones de datos) — sin este cambio, el propio CSP del sitio habría bloqueado en silencio cada evento que el SDK de cliente intenta mandar por `fetch`/beacon, dejando el monitoreo de errores de cliente completamente mudo aunque el DSN estuviera bien configurado.
- **`npm audit` sube a 8 vulnerabilidades pero no por una nueva real**: instalar `@sentry/nextjs` hace que npm marque también a ese paquete como "vulnerable" porque depende de `next` — el mismo `next` que el proyecto ya usa y cuyo riesgo de `postcss`/`sharp` ya estaba aceptado como residual (viene empaquetado en Next.js mismo). No es una dependencia nueva con una vulnerabilidad nueva, es la propagación de la misma que ya existía.
- No se pudo probar el reporte real de un error en Sentry en esta sesión (no hay DSN configurado todavía); sí se verificó que `tsc`/`eslint`/`npm test` siguen limpios y que la app sigue funcionando exactamente igual sin la variable configurada (comportamiento no-op confirmado por diseño del SDK, igual que Google OAuth cuando falta `GOOGLE_CLIENT_ID`).

## Los 12 hallazgos de severidad baja — todos cerrados (29 jul 2026)

- **ARCH-02** (ya estaba resuelto): `nextOrderNumber()` ya vivía en `src/lib/orderNumber.ts` desde el fix de ARCH-01 — efecto colateral, no requirió ningún cambio nuevo.
- **DEV-03 / UX-04 — `confirm()` nativo reemplazado**: `UsersManager.handleSuspend` usaba el diálogo nativo del navegador para suspender una cuenta, el único punto del producto que no pasaba por `ConfirmDialog`. Ahora usa el mismo componente que el resto del panel (mensaje con el nombre del usuario, tono "danger"). Verificado con Playwright: se abre el diálogo de la app, `dialog()` nativo nunca se dispara.
- **DEV-04 — un solo origen de verdad para los roles disponibles**: `UserEditForm` y `UsersManager` armaban a mano `["admin","supervisor","encargado","operario","cliente"]` para el caso admin, en paralelo a `manageableRoles()` de `hierarchy.ts`. Como `manageableRoles("admin")` ya devuelve exactamente esa lista, se eliminó la duplicación — ambos componentes derivan el 100% desde `hierarchy.ts`.
- **SEC-07 — CSV/Excel injection neutralizado** (`sanitizeSpreadsheetCell()` en `src/lib/utils.ts`): cualquier valor de celda que empiece con `=`, `+`, `-`, `@`, tab o retorno de carro ahora se antepone con una comilla simple antes de escribirse a un `.xlsx`, en las cuatro exportaciones que generan Excel (`exportUtils.ts`, `auditExport.ts`, `summaryExport.ts`, `productImportExport.ts`). Los exports a PDF no lo necesitan (jsPDF no interpreta fórmulas).
- **DATA-02 — límite de tamaño en `Product.specs`**: nuevo `isValidSpecs()` (máx. 30 especificaciones, 60/300 caracteres por clave/valor) aplicado en los tres caminos que escriben `specs` (`POST`/`PATCH /api/products`, importación masiva) — la importación reporta el error por fila igual que los demás campos inválidos.
- **DATA-03 — soft-delete de pedidos**: `Order` tiene ahora `deletedAt` (default `null`). `DELETE /api/orders/[id]` marca la fecha en vez de borrar el documento; todos los caminos de lectura (`GET /api/orders`, `GET /api/orders/[id]`, `PATCH`, KPIs, ranking de productos) excluyen `deletedAt != null`. El historial completo del pedido sobrevive — antes solo quedaba el hecho en Auditoría, no el contenido.
- **UX-03 — antigüedad visible en solicitudes pendientes** (`RequestsManager.tsx`): cada solicitud "Pendiente" muestra ahora "hace N días" junto al estado, con el color escalando a amarillo (3+ días) y rojo (7+ días) — antes solo se notaba que algo quedó estancado entrando a mirar a mano.
- **QA-03 — gate de calidad automático en cada commit**: se agregó `husky` con un hook de `pre-commit` que corre `tsc --noEmit` y `eslint .` antes de dejar commitear — complementa el CI (que corre en cada push/PR) con un chequeo local inmediato. Probado corriendo el hook a mano: pasa limpio con el estado actual del repo.
- **BIZ-03 — productos relacionados** (alcance acordado con el usuario: sin reseñas, que requieren moderación/anti-spam y son un proyecto en sí mismo): el modal de detalle de producto ahora muestra hasta 4 productos de la misma categoría ("También te puede interesar"), calculados en memoria a partir del catálogo ya cargado (sin modelo ni endpoint nuevo). Clickear uno de ellos abre su propio detalle. Verificado con Playwright: la sección aparece y es navegable.
- **BIZ-04 — confirmado, sin cambio de código**: "Egresos" como valor de pedidos cancelados ya era una decisión de negocio explícita del usuario (evitar construir un módulo de gastos aparte); se dejó como está.
- **INFRA-04 — política de backup (no es código)**: el proyecto depende del backup automático del tier de Atlas. Si producción corre en el tier gratuito M0 (sin snapshots automáticos), la única red de seguridad ante un borrado masivo accidental es lo que Auditoría loguea (y, desde DATA-03, el soft-delete de pedidos). Recomendación: si el volumen de pedidos/usuarios ya importa, vale evaluar subir a un tier M10+ de Atlas (backups automáticos con point-in-time recovery) o, más barato, correr `mongodump` contra producción en un cron externo — es una decisión de infraestructura/costo, no algo que el código pueda forzar por sí solo.
- Verificado en conjunto: `tsc`/`eslint`/`npm test` limpios, build de producción exitoso, y probado en vivo con Playwright (relacionados visibles, `ConfirmDialog` de suspensión sin `confirm()` nativo, listado de pedidos cargando correctamente tras el cambio a soft-delete).

## Qué está construido (funcional hoy)

- **Catálogo público**: sidebar de categorías (colapsa a 5 con "Ver todas"), filtros dinámicos de precio y especificaciones (aparecen al elegir categoría o buscar), indicador cantidad/stock en cada tarjeta ("1/5"), aviso "Agotado" elegante cuando stock=0, carrito, checkout con confirmación real de pedido.
- **Auth + RBAC**: login/registro propios, Google OAuth *scaffolded* (ver pendientes), sesiones JWT, permisos por rol. Rate limiting en `/api/auth/login` (`src/lib/auth/rateLimit.ts`, respaldado en Mongo con TTL, sin dependencias nuevas): máx. 8 intentos/15min por email y 30/15min por IP, respuesta 429 + `Retry-After`.
- **Productos**: CRUD completo con especificaciones (clave/valor), ISBN/código de barras (compatible con lector USB), moneda por producto (ARS/USD/UYU/EUR/BRL), imágenes desde cualquier URL https con extensión de imagen válida, carga masiva desde Excel (plantilla descargable, upsert por SKU, reporte de errores por fila) y exportación (todos o seleccionados).
- **Categorías**: alta, edición inline, borrado múltiple (bloquea si tienen productos asociados).
- **Pedidos**: máquina de estados con pestañas, reserva real de stock (se descuenta al crear, se devuelve al cancelar, se vuelve a descontar al reactivar con validación de stock disponible), confirmación explícita antes de cualquier cambio de estado, borrado individual/múltiple.
- **Auditoría**: registro automático de toda acción sensible, filtros (acción/usuario/recurso/fecha), export a Excel/PDF.
- **Resumen (dashboard)**: rango de fechas con atajos, KPIs (ventas, pedidos, egresos = valor de cancelados, stock, usuarios), ranking de productos más vendidos, export a Excel/PDF con explicación de cada indicador.
- **Ayuda contextual**: ícono "?" con tips en cada sección del dashboard.
- **Marca**: logo real (versión clara/oscura según tema, clickeable a "/" desde cualquier página) + favicon, paleta cyan/azul, tipografías Space Grotesk + Inter. Metadatos Open Graph/Twitter con imagen generada (`src/app/opengraph-image.tsx`) para que los links compartidos (WhatsApp, etc.) muestren logo + título + descripción.
- **Footer del catálogo**: crédito del desarrollador con email/llamada/WhatsApp clickeables y saludo pre-cargado.
- **Reconocimiento de cliente recurrente**: pedidos hechos como invitado se vinculan solos a la cuenta si después se registra/loguea con el mismo email; carrito guardado en el servidor por usuario (sobrevive cambio de dispositivo/navegador); enlace "Mis pedidos" visible en el header del catálogo para clientes logueados.
- **Usuarios jerárquicos + solicitudes de edición**: además de `cliente`, el staff tiene 4 roles (`admin > supervisor > encargado > operario`). Cada rol de staff administra únicamente a los roles debajo suyo (`src/lib/auth/hierarchy.ts`): admin ve/edita todo de forma inmediata; cualquier edición de cuenta (nombre/rol/estado/contraseña) hecha por alguien que no es admin —sobre sí mismo o sobre un subordinado— no se aplica al instante, sino que crea una `UserEditRequest` pendiente que escala al gerente directo de quien la generó (admin puede otorgar a un supervisor el privilegio `canApproveOwnEdits` para que se autoapruebe sus propios cambios). Toda solicitud queda con motivo del solicitante y motivo de quien aprueba/rechaza/elimina, visible en "Solicitudes" (`RequestsManager`) y también en Auditoría. "Mi perfil" (`/dashboard/perfil`) es la pantalla de autoservicio de nombre/contraseña para cualquier rol de staff.

## Pendiente de credenciales reales (no es código, es configuración externa)

Todo esto está *scaffolded* (el código ya existe y no rompe nada si falta), pero necesita que el usuario complete `.env.local`:

- **`MONGODB_URI`** — solo para producción (Atlas). En dev no hace falta.
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — login con Google para clientes. Sin esto, responde 501 con mensaje claro.
- **`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`** — monitoreo de errores (INFRA-03). Sin esto, `Sentry.init()` nunca se llama y todo sigue funcionando exactamente igual que antes (los errores quedan solo en `console.error`/logs de Vercel). Para activarlo: crear un proyecto Next.js en [sentry.io](https://sentry.io) (tier gratuito alcanza), copiar el DSN y pegarlo en ambas variables (mismo valor) en Vercel — `NEXT_PUBLIC_SENTRY_DSN` se necesita además porque se incrusta en el bundle del cliente en build time, así que hay que re-deployar después de agregarla.

> Se probó e implementó en un momento un flujo de confirmación de pedido por email/WhatsApp (PDF adjunto vía SMTP + WhatsApp Cloud API), pero **se revirtió a pedido del usuario** — no está en el código actual. Si se retoma, la nota técnica es: jsPDF + jspdf-autotable funcionan bien en Node para generar el PDF en el servidor (`autoTable(doc, {...})`, no `doc.autoTable(...)`), y conviene mantener el envío como fire-and-forget para no bloquear el checkout.

## Limitaciones técnicas conocidas

- Deployado en Vercel (`https://power-it-one.vercel.app`, repo `Antonio-David-Tejada-Villalon/power-it`) con MongoDB Atlas como base de producción — el audit original (`info.txt`) proponía Vercel + Render + Atlas, pero se decidió simplificar a un solo proyecto Next.js con Route Handlers como backend. Cada push a `main` dispara un deploy automático.

## Dónde mirar si algo no anda

- Errores de auth/RBAC → `src/proxy.ts` y `src/lib/auth/`.
- Errores de stock en pedidos → `src/lib/inventory.ts` y `src/app/api/orders/`.
- Quién puede aprobar/editar a quién → `src/lib/auth/hierarchy.ts` (toda la lógica de jerarquía vive ahí, no repetida en cada route handler).
- Algo no se exporta bien a Excel/PDF → `src/lib/*Export*.ts` (todos siguen el mismo patrón: `xlsx` + `jspdf`/`jspdf-autotable`).
- El favicon/logo no actualiza en el navegador → es caché de favicons de Chrome, no del código (probar en incógnito).
- Una imagen de producto no carga (ícono roto) → las fotos de `scripts/seed.ts` son URLs de Unsplash elegidas a mano (`IMG("<id>")`); esos IDs a veces dejan de existir del lado de Unsplash (404) sin que el código cambie. Ya pasó una vez (CPU-001, SSD-001, WEB-001, ACC-001) y se corrigió reemplazando los IDs rotos y parchando el campo `images` directo en Mongo (local y Atlas). Si vuelve a pasar, verificar con `curl -o /dev/null -w "%{http_code}" <url>` antes de asumir que es un bug de código.
