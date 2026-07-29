# Power IT — Estado del proyecto

> Documento de referencia para retomar el trabajo en una sesión nueva de Claude Code (o para cualquiera que se sume al proyecto). Última actualización: ver historial de git / fecha de este archivo.

## Qué es esto

Catálogo + panel administrativo de **Power IT** (tienda de tecnología). Arrancó como una plantilla de "Librería Reyna Domínguez" (catálogo de libros sin backend) y se reconvirtió por completo a una plataforma MERN con roles, pedidos, stock, auditoría y analíticas.

## Stack

- **Next.js 16** (App Router). Ojo: esta versión tiene cambios respecto a lo habitual — `middleware.ts` está deprecado y renombrado a **`proxy.ts`** (export `proxy`, no `middleware`), `params` en rutas dinámicas es `Promise<{...}>`, `cookies()`/`headers()` son async. Antes de tocar routing/middleware, revisar `node_modules/next/dist/docs/` (así lo pide `AGENTS.md`).
- **MongoDB vía Mongoose**. En desarrollo NO hace falta instalar Mongo ni Docker: `src/lib/db.ts` levanta automáticamente un Mongo real con `mongodb-memory-server` (persistido en `.data/mongo`, gitignored) si `MONGODB_URI` está vacío. Para producción, poner la connection string de Atlas en `MONGODB_URI`.
- **TypeScript, Tailwind CSS 4, Framer Motion, lucide-react**.
- **Auth propia**: JWT (`jose`) en cookies httpOnly (`pit_at` 15min / `pit_rt` 7 días), hashing con `bcryptjs`. RBAC por `role` + `permissions[]` (no solo el string de rol).
- **Roles**: `admin`, `supervisor`, `encargado`, `operario`, `cliente`. Jerarquía de staff: admin → supervisor → encargado → operario (`src/lib/auth/hierarchy.ts`). `cliente` es externo, fuera de esta cadena.

## Cómo correrlo

```bash
npm install
npm run dev     # levanta Mongo local automático + Next en :3000
npm run seed     # puebla categorías, ~21 productos y usuarios de prueba
npm test         # corre la suite de Vitest (hierarchy.ts + inventory.ts)
```

Credenciales sembradas por `npm run seed`:

| Rol | Email | Password |
|---|---|---|
| admin | admin@powerit.local | PowerIT#2026 |
| supervisor | supervisor@powerit.local | Supervisor#2026 |
| encargado | encargado@powerit.local | Encargado#2026 |
| operario | operario@powerit.local | Operario#2026 |
| cliente | cliente@powerit.local | Cliente#2026 |

`npx tsc --noEmit` y `npx eslint .` deben quedar sin errores antes de dar por terminado cualquier cambio (así se validó todo lo construido hasta ahora).

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
  models/                      # User, Product, Category, Order, AuditLog, Settings, UserEditRequest
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

Pendientes del plan original: `xlsx` desactualizado (SEC-06 — las versiones parchadas de SheetJS ya no se publican en npm, requiere sourcing externo o migrar a `exceljs`, decisión pendiente de confirmar), `dompurify` desactualizado (vía `jspdf`, moderado), y los de negocio (BIZ-01/02). Ver el informe completo si se necesita retomarlos.

## Imágenes de cualquier URL + multi-moneda (29 jul 2026)

- **Imágenes de producto desde cualquier URL** (`src/lib/utils.ts` → `isImageUrl`): antes solo `images.unsplash.com` funcionaba (restricción de `next/image`). Ahora se acepta cualquier host, siempre que la URL sea `https` y termine en `.jpg/.jpeg/.png/.gif/.webp/.avif/.svg` (validado con Zod en `POST`/`PATCH /api/products` y en la importación masiva). Las imágenes de producto se renderizan con `next/image` en modo `unoptimized` (`ProductCard`, `ProductDetailModal`, `CartSidebar`, `ProductsTable`, `TopProductsRanking`) — el servidor nunca descarga ni procesa la imagen, así que no reabre el riesgo de SSRF/DoS del optimizador de Next contra un host arbitrario (ver SEC-02 en la auditoría). CSP `img-src` ampliado a cualquier `https:`. De yapa, esto arregló que un producto de prueba viejo ("probando imagen", con una imagen en `i.ibb.co`) rompiera el catálogo público en local.
- **Moneda por producto** (`src/lib/currency.ts`, campo `currency` en `Product`): al cargar/editar un producto se elige entre ARS, USD, UYU, EUR o BRL (`CURRENCIES`). Default `"USD"` para no reinterpretar productos ya cargados. La plantilla de importación masiva tiene una columna `Moneda` (opcional, default USD).
- **Conversión automática por ubicación del visitante** (`src/app/api/currency/route.ts` + `src/lib/exchangeRates.ts`): en el catálogo público, cada producto muestra su precio convertido a la moneda del país del visitante (detectado gratis vía la cabecera `x-vercel-ip-country` de Vercel, sin pedir permisos ni login), con el precio original como referencia debajo ("≈ ... precio de referencia, puede variar"). Los tipos de cambio se obtienen de `open.er-api.com` (gratis, sin API key) y se cachean en Mongo (`ExchangeRate`) por 1 hora para no golpear la API en cada visita; si la API falla, se usa la última tasa cacheada o un valor aproximado fijo. En local, `x-vercel-ip-country` no existe — se puede simular con la variable de entorno `DEV_GEO_COUNTRY` (ej. `DEV_GEO_COUNTRY=AR npm run dev`), y sin nada seteado cae a USD.
- **Un pedido no mezcla monedas**: `useCart` rechaza agregar un producto de una moneda distinta a la que ya está en el carrito (mensaje claro, no falla en silencio); `POST /api/orders` valida lo mismo server-side y guarda `order.currency`. El checkout/carrito siempre muestra la moneda real del pedido, nunca la convertida (la conversión es solo una ayuda de referencia en el catálogo, no lo que se factura).
- **KPIs y ranking de productos ahora sí sopesan multi-moneda**: `/api/dashboard/kpis` y `/api/dashboard/top-products` agrupan por moneda y convierten todo a USD (moneda de referencia del dashboard) antes de sumar — antes sumaban `$total`/`$subtotal` crudos, lo que habría dado un número sin sentido apenas hubiera pedidos en más de una moneda. Los labels de KPI ahora dicen explícitamente "(USD)".
- Probado en vivo: producto ARS con imagen `i.ibb.co` creado y mostrado con precio convertido a USD; bloqueo de mezcla de monedas en el carrito (capturado en pantalla); pedido creado con `currency:"ARS"`; KPIs recalculados correctamente sumando un pedido ARS + pedidos USD existentes sin romperse.

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
- **Usuarios jerárquicos + solicitudes de edición**: además de `cliente`, el staff tiene 4 roles (`admin > supervisor > encargado > operario`). Cada rol de staff administra únicamente a los roles debajo suyo (`src/lib/auth/hierarchy.ts`): admin ve/edita todo de forma inmediata; cualquier edición de cuenta (nombre/rol/estado/contraseña) hecha por alguien que no es admin —sobre sí mismo o sobre un subordinado— no se aplica al instante, sino que crea una `UserEditRequest` pendiente que escala al gerente directo de quien la generó (admin puede otorgar a un supervisor el privilegio `canApproveOwnEdits` para que se autoapruebe sus propios cambios). Toda solicitud queda con motivo del solicitante y motivo de quien aprueba/rechaza/elimina, visible en "Solicitudes" (`RequestsManager`) y también en Auditoría. "Mi perfil" (`/dashboard/perfil`) es la pantalla de autoservicio de nombre/contraseña para cualquier rol de staff.

## Pendiente de credenciales reales (no es código, es configuración externa)

Todo esto está *scaffolded* (el código ya existe y no rompe nada si falta), pero necesita que el usuario complete `.env.local`:

- **`MONGODB_URI`** — solo para producción (Atlas). En dev no hace falta.
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — login con Google para clientes. Sin esto, responde 501 con mensaje claro.

> Se probó e implementó en un momento un flujo de confirmación de pedido por email/WhatsApp (PDF adjunto vía SMTP + WhatsApp Cloud API), pero **se revirtió a pedido del usuario** — no está en el código actual. Si se retoma, la nota técnica es: jsPDF + jspdf-autotable funcionan bien en Node para generar el PDF en el servidor (`autoTable(doc, {...})`, no `doc.autoTable(...)`), y conviene mantener el envío como fire-and-forget para no bloquear el checkout.

## Limitaciones técnicas conocidas

- `mongodb-memory-server` corre standalone (sin replica set) → **no hay transacciones multi-documento**. Los ajustes de stock (`src/lib/inventory.ts`) usan updates atómicos por ítem con reversión manual en vez de `session.startTransaction()`. Si en el futuro se pasa a un cluster Atlas con replica set, se podría migrar a transacciones reales.
- Deployado en Vercel (`https://power-it-one.vercel.app`, repo `Antonio-David-Tejada-Villalon/power-it`) con MongoDB Atlas como base de producción — el audit original (`info.txt`) proponía Vercel + Render + Atlas, pero se decidió simplificar a un solo proyecto Next.js con Route Handlers como backend. Cada push a `main` dispara un deploy automático.

## Dónde mirar si algo no anda

- Errores de auth/RBAC → `src/proxy.ts` y `src/lib/auth/`.
- Errores de stock en pedidos → `src/lib/inventory.ts` y `src/app/api/orders/`.
- Quién puede aprobar/editar a quién → `src/lib/auth/hierarchy.ts` (toda la lógica de jerarquía vive ahí, no repetida en cada route handler).
- Algo no se exporta bien a Excel/PDF → `src/lib/*Export*.ts` (todos siguen el mismo patrón: `xlsx` + `jspdf`/`jspdf-autotable`).
- El favicon/logo no actualiza en el navegador → es caché de favicons de Chrome, no del código (probar en incógnito).
- Una imagen de producto no carga (ícono roto) → las fotos de `scripts/seed.ts` son URLs de Unsplash elegidas a mano (`IMG("<id>")`); esos IDs a veces dejan de existir del lado de Unsplash (404) sin que el código cambie. Ya pasó una vez (CPU-001, SSD-001, WEB-001, ACC-001) y se corrigió reemplazando los IDs rotos y parchando el campo `images` directo en Mongo (local y Atlas). Si vuelve a pasar, verificar con `curl -o /dev/null -w "%{http_code}" <url>` antes de asumir que es un bug de código.
