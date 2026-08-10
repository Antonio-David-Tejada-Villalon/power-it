import Link from "next/link";
import {
  BookOpen,
  Users2,
  Store,
  Package,
  FolderTree,
  ClipboardList,
  UserCog,
  ShieldCheck,
  LineChart,
  Settings,
  Lock,
  HelpCircle,
} from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: typeof BookOpen;
}

const SECTIONS: Section[] = [
  { id: "roles", label: "Roles y permisos", icon: Users2 },
  { id: "catalogo", label: "Catálogo público", icon: Store },
  { id: "productos", label: "Productos", icon: Package },
  { id: "categorias", label: "Categorías", icon: FolderTree },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "usuarios", label: "Usuarios y solicitudes", icon: UserCog },
  { id: "auditoria", label: "Auditoría", icon: ShieldCheck },
  { id: "resumen", label: "Resumen (KPIs)", icon: LineChart },
  { id: "configuracion", label: "Configuración", icon: Settings },
  { id: "seguridad", label: "Sesión y seguridad", icon: Lock },
  { id: "ayuda", label: "Dudas frecuentes", icon: HelpCircle },
];

function Callout({ tone, children }: { tone: "info" | "warning"; children: React.ReactNode }) {
  const cls = tone === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary";
  return <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${cls}`}>{children}</div>;
}

function H2({ id, icon: Icon, children }: { id: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="p-2.5 bg-primary rounded-xl text-white">
        <Icon size={20} />
      </div>
      <h2 id={id} className="font-heading text-2xl font-bold scroll-mt-24">
        {children}
      </h2>
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-heading text-lg font-bold pt-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground-secondary leading-relaxed">{children}</p>;
}

export default function ManualPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-2xl text-white">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold">Manual del sistema</h1>
            <p className="text-foreground-secondary">
              Cómo funciona Power IT de punta a punta y cómo usar cada sección del panel.
            </p>
          </div>
        </div>
        <Callout tone="info">
          Esta página es visible solo para <b>administradores</b> y <b>supervisores</b> — ni el resto del equipo
          ni los clientes pueden verla.
        </Callout>
      </div>

      {/* Tabla de contenidos */}
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-primary/10 hover:text-primary rounded-full text-xs font-semibold transition-colors"
          >
            <s.icon size={13} />
            {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {/* ---------------- ROLES ---------------- */}
        <section className="space-y-4">
          <H2 id="roles" icon={Users2}>
            Roles y permisos
          </H2>
          <P>
            El sistema tiene una jerarquía de 4 roles internos —{" "}
            <b>Administrador → Supervisor → Encargado → Operario</b> — más el rol <b>Cliente</b>, que es externo y no
            forma parte de esta cadena. Cada rol de staff administra únicamente a los roles que tiene debajo, nunca a
            los de igual o mayor jerarquía.
          </P>

          <div className="overflow-x-auto rounded-2xl border border-[color:var(--glass-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-left">
                  <th className="p-3 font-semibold">Rol</th>
                  <th className="p-3 font-semibold">Qué ve en el panel</th>
                  <th className="p-3 font-semibold">A quién administra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--glass-border)]">
                <tr>
                  <td className="p-3 font-semibold">Administrador</td>
                  <td className="p-3 text-foreground-secondary">Todo el panel, sin restricciones.</td>
                  <td className="p-3 text-foreground-secondary">A todos: supervisores, encargados, operarios y clientes.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Supervisor</td>
                  <td className="p-3 text-foreground-secondary">
                    Resumen, Productos, Pedidos, Usuarios, Solicitudes, Manual y Mi perfil. No ve Categorías, Auditoría
                    ni Configuración (eso queda solo para Administrador).
                  </td>
                  <td className="p-3 text-foreground-secondary">Encargados y operarios.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Encargado</td>
                  <td className="p-3 text-foreground-secondary">
                    Resumen, Pedidos (puede cambiar el estado, no eliminar), Inventario (solo actualizar stock),
                    Usuarios, Solicitudes y Mi perfil.
                  </td>
                  <td className="p-3 text-foreground-secondary">Operarios.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Operario</td>
                  <td className="p-3 text-foreground-secondary">Solo Mis solicitudes y Mi perfil.</td>
                  <td className="p-3 text-foreground-secondary">A nadie.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Cliente</td>
                  <td className="p-3 text-foreground-secondary">
                    No entra al panel — usa el catálogo público y &quot;Mis pedidos&quot;.
                  </td>
                  <td className="p-3 text-foreground-secondary">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <H3>Por qué un cambio &quot;no se aplica&quot; al instante</H3>
          <P>
            Cuando un <b>Administrador</b> edita una cuenta (nombre, rol, estado o contraseña), el cambio se aplica de
            inmediato. Cuando lo hace cualquier otro rol de staff — sobre sí mismo o sobre un subordinado — el cambio
            no se aplica solo: queda como una <b>solicitud pendiente</b> que sube al responsable directo (el gerente
            inmediato en la cadena de arriba). Ver la sección{" "}
            <a href="#usuarios" className="text-primary font-semibold">
              Usuarios y solicitudes
            </a>
            .
          </P>
        </section>

        {/* ---------------- CATÁLOGO ---------------- */}
        <section className="space-y-4">
          <H2 id="catalogo" icon={Store}>
            Catálogo público
          </H2>
          <P>Es lo que ve cualquier visitante en la página principal, sin necesidad de iniciar sesión.</P>
          <H3>Categorías, búsqueda y filtros</H3>
          <P>
            El sidebar de categorías es un árbol expandible de hasta 3 niveles (Categoría → Subcategoría → Familia).
            Elegir una categoría filtra <b>toda su rama</b>: por ejemplo, elegir &quot;Notebooks&quot; también muestra
            productos cargados en &quot;Gaming&quot;, &quot;Hogar&quot;, etc. debajo de esa categoría. Al buscar texto
            o elegir una categoría aparecen filtros de precio y de especificaciones (por ejemplo, RAM o CPU) armados
            automáticamente según los productos que coinciden.
          </P>
          <H3>Precio en la moneda del visitante</H3>
          <P>
            Cada producto tiene una moneda de carga (ARS, USD, UYU, EUR o BRL). En el catálogo, el precio se muestra
            además convertido a la moneda del país del visitante (detectado automáticamente por su ubicación), como
            referencia — el precio real que se factura siempre es el original del producto, nunca el convertido.
          </P>
          <H3>Carrito y pedido</H3>
          <P>
            El carrito no permite mezclar productos de distinta moneda en un mismo pedido. Al &quot;Confirmar
            pedido&quot;, no hay cobro con tarjeta dentro del sistema: se genera un pedido para seguimiento manual del
            equipo (el pago se coordina por fuera, con el método que corresponda) y también se puede exportar la lista
            a PDF o Excel, o enviarla por email. Un cliente que compra sin cuenta y después se registra con el mismo
            email ve automáticamente ese pedido en &quot;Mis pedidos&quot;.
          </P>
        </section>

        {/* ---------------- PRODUCTOS ---------------- */}
        <section className="space-y-4">
          <H2 id="productos" icon={Package}>
            Productos
          </H2>
          <P>
            Alta, edición y baja de productos desde <i>Productos → Nuevo producto</i> (o el ícono de lápiz en la
            tabla para editar). Campos disponibles: SKU, slug, ISBN/código de barras (compatible con lector USB),
            nombre, categoría, marca, precio y moneda, stock, imágenes, estado (Activo / Agotado / Descontinuado),
            destacado, especificaciones (pares clave/valor como &quot;RAM: 16GB&quot;) y descripción.
          </P>
          <H3>Categoría del producto</H3>
          <P>
            Se elige con 3 selectores en cascada: Categoría (obligatoria), Subcategoría y Familia (opcionales,
            aparecen solo si esa rama las tiene). Elegí siempre el nivel más específico disponible — ayuda a que el
            producto aparezca en los filtros correctos del catálogo.
          </P>
          <H3>Descripción con formato</H3>
          <P>
            El campo Descripción tiene una barra con Negrita, Cursiva, Lista con viñetas y Lista numerada — funciona
            como el modo texto plano de un email (los botones insertan el formato, no hace falta escribir código).
            Tiene un límite de 1000 caracteres, con un contador visible que se pone en amarillo cerca del límite.
          </P>
          <H3>Imágenes</H3>
          <P>
            Se cargan como URLs separadas por coma. Cualquier sitio sirve, siempre que el link empiece con{" "}
            <code className="text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">https://</code> y termine en
            .jpg, .png, .gif, .webp, .avif o .svg.
          </P>
          <H3>Carga y descarga masiva (Excel)</H3>
          <P>
            Desde la tabla de Productos se puede descargar una plantilla de Excel, completarla (o exportar los
            productos actuales para editarlos) y volver a subirla: crea los productos nuevos y actualiza los
            existentes por SKU. Si alguna fila tiene un dato inválido (moneda, imagen o categoría inexistente), se
            informa el número de fila y el motivo puntual, y el resto de las filas válidas se procesa igual.
          </P>
          <Callout tone="warning">
            Un producto eliminado no vuelve a aparecer solo. Si alguna vez hace falta reconstruir el catálogo de
            prueba desde cero en un entorno de desarrollo, es un paso explícito para quien administra el servidor, no
            algo que pase por accidente.
          </Callout>
        </section>

        {/* ---------------- CATEGORÍAS ---------------- */}
        <section className="space-y-4">
          <H2 id="categorias" icon={FolderTree}>
            Categorías
          </H2>
          <P>
            Solo Administrador la ve en el menú. Es un árbol de hasta 3 niveles (Categoría → Subcategoría → Familia):
          </P>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground-secondary">
            <li>
              <b>Crear:</b> el botón &quot;Nueva categoría&quot; crea una categoría raíz; el ícono &quot;+&quot; junto
              a cualquier categoría o subcategoría crea un nivel debajo de ella directamente (sin tener que elegir el
              padre a mano).
            </li>
            <li>
              <b>Editar:</b> el ícono de lápiz permite cambiar nombre, imagen, descripción, estado, orden, y también{" "}
              <b>mover</b> la categoría a otra rama del árbol.
            </li>
            <li>
              <b>Eliminar:</b> se bloquea si la categoría todavía tiene subcategorías o productos asociados — hay que
              vaciarla primero.
            </li>
            <li>
              <b>Expandir todo / Colapsar todo</b> ayuda a moverse rápido por un árbol grande.
            </li>
          </ul>
        </section>

        {/* ---------------- PEDIDOS ---------------- */}
        <section className="space-y-4">
          <H2 id="pedidos" icon={ClipboardList}>
            Pedidos
          </H2>
          <P>
            Cada pedido pasa por los estados: <b>Pendiente → Confirmado → En proceso → Enviado → Completado</b>, o{" "}
            <b>Cancelado</b> en cualquier momento. Cambiar el estado siempre pide confirmación explícita antes de
            aplicarse (con un mensaje distinto si implica devolver o volver a descontar stock).
          </P>
          <H3>Reserva de stock automática</H3>
          <P>
            Al crearse un pedido, el stock de cada producto se descuenta al instante (si no alcanza, el pedido no se
            puede confirmar). Cancelar un pedido devuelve ese stock; reactivarlo (pasarlo de Cancelado a otro estado)
            vuelve a descontarlo, y si no hay stock suficiente en ese momento, avisa con un error claro y no cambia el
            estado.
          </P>
          <H3>Eliminar un pedido</H3>
          <P>
            Solo Administrador y Supervisor pueden eliminar pedidos (individualmente o en selección múltiple). Al
            eliminar, si el pedido no estaba cancelado, el stock se libera antes de borrarlo. El pedido deja de verse
            en las listas, pero el hecho de que existió y se eliminó queda igual en Auditoría.
          </P>
        </section>

        {/* ---------------- USUARIOS ---------------- */}
        <section className="space-y-4">
          <H2 id="usuarios" icon={UserCog}>
            Usuarios y solicitudes de edición
          </H2>
          <P>
            Desde <i>Usuarios</i> se crean cuentas de staff (nombre, email, contraseña y rol — solo se pueden asignar
            roles que están por debajo del propio, según la tabla de la sección{" "}
            <a href="#roles" className="text-primary font-semibold">
              Roles y permisos
            </a>
            ). Suspender una cuenta (solo Administrador) impide que esa persona vuelva a iniciar sesión hasta
            reactivarla.
          </P>
          <H3>Cómo funcionan las solicitudes</H3>
          <P>
            Si quien edita una cuenta no es Administrador, el cambio no se aplica solo: se crea una{" "}
            <b>solicitud pendiente</b> con el motivo que escribió quien la generó, y aparece en{" "}
            <i>Solicitudes</i> de su responsable directo para que la apruebe o rechace (también con un motivo). Un
            Administrador puede otorgarle a un supervisor el permiso de <b>autoaprobar</b> sus propias solicitudes
            (nunca las de un subordinado que haya editado) para no tener que esperar a nadie más en ese caso puntual.
          </P>
          <P>
            En la lista de Solicitudes, cada una pendiente muestra hace cuántos días está esperando (en amarillo a
            partir de 3 días, en rojo a partir de 7) para que no se pierda de vista.
          </P>
        </section>

        {/* ---------------- AUDITORÍA ---------------- */}
        <section className="space-y-4">
          <H2 id="auditoria" icon={ShieldCheck}>
            Auditoría
          </H2>
          <P>Solo Administrador. Registra automáticamente toda acción sensible del sistema: quién hizo qué, sobre qué
            registro y cuándo — altas, ediciones y bajas de productos, categorías, pedidos y usuarios; inicios de
            sesión; aprobaciones y rechazos de solicitudes; y más.
          </P>
          <P>
            Se puede filtrar por acción, usuario, tipo de recurso y rango de fechas, y exportar el resultado filtrado
            a Excel o PDF — útil para revisar qué pasó en un período puntual sin tener que mirar todo el historial.
          </P>
        </section>

        {/* ---------------- RESUMEN ---------------- */}
        <section className="space-y-4">
          <H2 id="resumen" icon={LineChart}>
            Resumen (KPIs)
          </H2>
          <P>
            Es la primera pantalla que ve Administrador y Supervisor al entrar. Los indicadores de dinero (Ventas del
            período y Egresos) se muestran siempre en <b>pesos argentinos</b>, convirtiendo automáticamente los
            pedidos que se cargaron en otra moneda al tipo de cambio del momento.
          </P>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground-secondary">
            <li>
              <b>Ventas del período (ARS):</b> suma de los pedidos no cancelados creados en el rango de fechas
              elegido.
            </li>
            <li>
              <b>Egresos (cancelados, ARS):</b> valor total de los pedidos cancelados en ese mismo rango — dinero que
              se había reservado y no se concretó. No es un módulo de gastos contables, es una métrica proxy elegida a
              propósito para no duplicar esa contabilidad acá.
            </li>
            <li>
              <b>Pedidos del período / cancelados</b>, <b>Productos sin stock</b> y <b>Usuarios activos</b> (solo
              Administrador) son conteos simples.
            </li>
          </ul>
          <P>
            El selector de rango de fechas tiene atajos rápidos (hoy, últimos 7 días, este mes, este año). Debajo se
            ve el ranking de productos más vendidos del período, también en pesos argentinos. Ambos — indicadores y
            ranking — se pueden exportar a Excel o PDF con la explicación de cada indicador incluida.
          </P>
        </section>

        {/* ---------------- CONFIGURACIÓN ---------------- */}
        <section className="space-y-4">
          <H2 id="configuracion" icon={Settings}>
            Configuración
          </H2>
          <P>
            Solo Administrador. Permite cambiar el nombre del sitio, el email de contacto que se usa en el catálogo,
            el título/subtítulo/imagen del banner principal, y si se permite o no completar un pedido sin tener
            cuenta (checkout como invitado).
          </P>
        </section>

        {/* ---------------- SEGURIDAD ---------------- */}
        <section className="space-y-4">
          <H2 id="seguridad" icon={Lock}>
            Sesión y seguridad
          </H2>
          <P>
            La sesión se renueva sola cada pocos minutos mientras la pestaña del navegador esté abierta, así que no
            debería cerrarse por inactividad en medio de una tarea larga. Si el navegador estuvo cerrado o el
            dispositivo en reposo por mucho tiempo, puede pedir iniciar sesión de nuevo.
          </P>
          <P>
            Las contraseñas deben tener al menos 8 caracteres combinando letras y números, y no pueden ser una de las
            más obvias (como &quot;12345678&quot;). Después de varios intentos fallidos seguidos de inicio de sesión
            con el mismo email o desde la misma conexión, el sistema bloquea temporalmente nuevos intentos como
            protección.
          </P>
        </section>

        {/* ---------------- AYUDA ---------------- */}
        <section className="space-y-4">
          <H2 id="ayuda" icon={HelpCircle}>
            Dudas frecuentes
          </H2>
          <div className="space-y-4">
            <div>
              <H3>¿Por qué no veo Categorías/Auditoría/Configuración en mi menú?</H3>
              <P>Son exclusivas de Administrador. Si las necesitás, pedíselas a un administrador.</P>
            </div>
            <div>
              <H3>¿Por qué mi cambio quedó &quot;pendiente&quot; en vez de aplicarse?</H3>
              <P>
                Cualquier edición de cuenta hecha por alguien que no es Administrador queda como solicitud — ver{" "}
                <a href="#usuarios" className="text-primary font-semibold">
                  Usuarios y solicitudes
                </a>
                .
              </P>
            </div>
            <div>
              <H3>¿Por qué no puedo eliminar una categoría?</H3>
              <P>Todavía tiene subcategorías o productos cargados — hay que vaciarla primero.</P>
            </div>
            <div>
              <H3>¿Dónde veo qué pasó con un pedido o producto en el pasado?</H3>
              <P>
                En{" "}
                <a href="#auditoria" className="text-primary font-semibold">
                  Auditoría
                </a>{" "}
                (solo Administrador), filtrando por el recurso, la fecha o quién hizo el cambio.
              </P>
            </div>
          </div>
          <Callout tone="info">
            Cada sección del panel además tiene su propio ícono de ayuda (?) con tips rápidos específicos de esa
            pantalla — este manual es la referencia completa; el (?) es el recordatorio corto del día a día.
          </Callout>
          <p className="text-xs text-foreground-secondary pt-2">
            ¿Algo no está cubierto acá o no coincide con lo que ves en el panel?{" "}
            <Link href="/dashboard/perfil" className="text-primary font-semibold">
              Avisale a un administrador
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
