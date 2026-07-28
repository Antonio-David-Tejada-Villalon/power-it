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

## Qué está construido (funcional hoy)

- **Catálogo público**: sidebar de categorías (colapsa a 5 con "Ver todas"), filtros dinámicos de precio y especificaciones (aparecen al elegir categoría o buscar), indicador cantidad/stock en cada tarjeta ("1/5"), aviso "Agotado" elegante cuando stock=0, carrito, checkout con confirmación real de pedido.
- **Auth + RBAC**: login/registro propios, Google OAuth *scaffolded* (ver pendientes), sesiones JWT, permisos por rol.
- **Productos**: CRUD completo con especificaciones (clave/valor), ISBN/código de barras (compatible con lector USB), carga masiva desde Excel (plantilla descargable, upsert por SKU, reporte de errores por fila) y exportación (todos o seleccionados).
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
