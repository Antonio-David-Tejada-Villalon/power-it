import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

function assertSeedTargetIsSafe() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return; // vacío -> mongodb-memory-server local, siempre seguro.

  const isLocal = uri.includes("127.0.0.1") || uri.includes("localhost");
  if (isLocal) return;

  if (process.env.SEED_CONFIRM !== "yes") {
    console.error(
      "\n🛑 MONGODB_URI apunta a una base remota (no local) y este script SOBRESCRIBE " +
        "categorías y productos existentes (upsert por slug/SKU).\n" +
        "Si de verdad querés correr el seed contra esa base, repetí el comando agregando " +
        "SEED_CONFIRM=yes por delante.\n"
    );
    process.exit(1);
  }
  console.warn("⚠️  Corriendo seed contra una base remota, con confirmación explícita (SEED_CONFIRM=yes).\n");
}

assertSeedTargetIsSafe();

// Árbol de 3 niveles (Categoría > Subcategoría > Familia) pensado para un
// catálogo de tecnología profesional (ver ESTADO_PROYECTO.md). "Marcas" no
// entra acá: es una entidad aparte (Product.brand), no un nodo de categoría.
interface TaxonomyNode {
  name: string;
  children?: TaxonomyNode[];
}

const CATEGORY_TAXONOMY: TaxonomyNode[] = [
  {
    name: "Computadoras",
    children: [
      {
        name: "Notebooks",
        children: [
          { name: "Hogar" },
          { name: "Oficina" },
          { name: "Gaming" },
          { name: "Empresariales" },
          { name: "Ultrabooks" },
          { name: "Chromebooks" },
          { name: "2 en 1" },
        ],
      },
      {
        name: "PC de Escritorio",
        children: [
          { name: "Hogar" },
          { name: "Oficina" },
          { name: "Gaming" },
          { name: "Workstation" },
          { name: "All in One" },
          { name: "Mini PC" },
        ],
      },
      {
        name: "Servidores",
        children: [{ name: "Rack" }, { name: "Torre" }, { name: "NAS" }, { name: "Micro Servidores" }],
      },
    ],
  },
  {
    name: "Componentes de PC",
    children: [
      { name: "Procesadores", children: [{ name: "Intel" }, { name: "AMD" }] },
      { name: "Motherboards", children: [{ name: "Intel" }, { name: "AMD" }] },
      { name: "Memorias RAM", children: [{ name: "DDR4" }, { name: "DDR5" }, { name: "ECC" }] },
      { name: "Placas de Video", children: [{ name: "NVIDIA" }, { name: "AMD" }, { name: "Intel ARC" }] },
      { name: "Discos", children: [{ name: "SSD SATA" }, { name: "SSD NVMe" }, { name: "HDD" }, { name: "Externos" }] },
      { name: "Fuentes", children: [{ name: "Modular" }, { name: "Semi Modular" }, { name: "Estándar" }] },
      { name: "Gabinetes", children: [{ name: "Mini Tower" }, { name: "Mid Tower" }, { name: "Full Tower" }] },
      {
        name: "Refrigeración",
        children: [{ name: "Aire" }, { name: "Water Cooling" }, { name: "Ventiladores" }, { name: "Pasta térmica" }],
      },
    ],
  },
  {
    name: "Monitores",
    children: [
      { name: "Oficina" },
      { name: "Gaming" },
      { name: "Curvos" },
      { name: "UltraWide" },
      { name: "4K" },
      { name: "Portátiles" },
    ],
  },
  {
    name: "Periféricos",
    children: [
      { name: "Teclados", children: [{ name: "Mecánicos" }, { name: "Membrana" }, { name: "Wireless" }, { name: "RGB" }] },
      { name: "Mouse", children: [{ name: "Gaming" }, { name: "Oficina" }, { name: "Bluetooth" }] },
      { name: "Mouse Pad" },
      { name: "Auriculares", children: [{ name: "Gaming" }, { name: "Bluetooth" }, { name: "Oficina" }] },
      { name: "Micrófonos" },
      { name: "Webcams" },
      { name: "Parlantes" },
    ],
  },
  {
    name: "Redes",
    children: [
      { name: "Routers" },
      { name: "Access Point" },
      { name: "Switches" },
      { name: "Repetidores" },
      { name: "Placas de Red" },
      { name: "Adaptadores WiFi" },
      { name: "Cableado" },
    ],
  },
  {
    name: "Impresión",
    children: [
      { name: "Impresoras", children: [{ name: "InkJet" }, { name: "Láser" }, { name: "Multifunción" }, { name: "Térmicas" }] },
      { name: "Tintas" },
      { name: "Tóner" },
      { name: "Papel" },
    ],
  },
  {
    name: "Almacenamiento",
    children: [{ name: "Pendrives" }, { name: "Tarjetas SD" }, { name: "Discos Externos" }, { name: "NAS" }, { name: "Cajas Externas" }],
  },
  {
    name: "Telefonía",
    children: [{ name: "Smartphones" }, { name: "Tablets" }, { name: "Smartwatch" }, { name: "Accesorios" }],
  },
  {
    name: "Gaming",
    children: [
      { name: "Consolas", children: [{ name: "PlayStation" }, { name: "Xbox" }, { name: "Nintendo" }] },
      { name: "Juegos" },
      { name: "Controles" },
      { name: "Volantes" },
      { name: "Sillas Gamer" },
    ],
  },
  {
    name: "Audio",
    children: [{ name: "Parlantes" }, { name: "Home Theater" }, { name: "Barras de Sonido" }, { name: "Equipos de Música" }],
  },
  {
    name: "TV y Video",
    children: [{ name: "Smart TV" }, { name: "Android TV" }, { name: "Streaming" }, { name: "Proyectores" }, { name: "Chromecast" }],
  },
  {
    name: "Cámaras",
    children: [{ name: "Cámaras IP" }, { name: "CCTV" }, { name: "DVR" }, { name: "NVR" }, { name: "Accesorios" }],
  },
  {
    name: "Oficina",
    children: [{ name: "Sillas" }, { name: "Escritorios" }, { name: "UPS" }, { name: "Destructoras" }, { name: "Calculadoras" }],
  },
  {
    name: "Electrodomésticos",
    children: [
      {
        name: "Cocina",
        children: [
          { name: "Microondas" },
          { name: "Hornos" },
          { name: "Freidoras" },
          { name: "Cafeteras" },
          { name: "Licuadoras" },
          { name: "Batidoras" },
          { name: "Tostadoras" },
          { name: "Pavas Eléctricas" },
        ],
      },
      { name: "Refrigeración", children: [{ name: "Heladeras" }, { name: "Freezers" }, { name: "Cavas" }] },
      { name: "Lavado", children: [{ name: "Lavarropas" }, { name: "Secarropas" }, { name: "Lavavajillas" }] },
      {
        name: "Climatización",
        children: [
          { name: "Aires Acondicionados" },
          { name: "Ventiladores" },
          { name: "Estufas" },
          { name: "Calefactores" },
          { name: "Purificadores" },
        ],
      },
      { name: "Limpieza", children: [{ name: "Aspiradoras" }, { name: "Robots Aspiradores" }, { name: "Hidrolavadoras" }] },
      { name: "Cuidado Personal", children: [{ name: "Secadores" }, { name: "Planchitas" }, { name: "Afeitadoras" }, { name: "Masajeadores" }] },
    ],
  },
  {
    name: "Energía",
    children: [{ name: "UPS" }, { name: "Estabilizadores" }, { name: "Generadores" }, { name: "Paneles Solares" }, { name: "Baterías" }],
  },
  {
    name: "Seguridad",
    children: [{ name: "Alarmas" }, { name: "Sensores" }, { name: "Cerraduras Inteligentes" }, { name: "Videoporteros" }],
  },
  {
    name: "Domótica",
    children: [
      { name: "Alexa" },
      { name: "Google Home" },
      { name: "Smart Lights" },
      { name: "Smart Switches" },
      { name: "Smart Plugs" },
      { name: "Sensores" },
    ],
  },
  {
    name: "Cables y Adaptadores",
    children: [
      { name: "HDMI" },
      { name: "DisplayPort" },
      { name: "USB" },
      { name: "USB-C" },
      { name: "VGA" },
      { name: "DVI" },
      { name: "Audio" },
      { name: "Red" },
      { name: "Adaptadores" },
    ],
  },
  {
    name: "Accesorios",
    children: [{ name: "Mochilas" }, { name: "Fundas" }, { name: "Soportes" }, { name: "Bases Refrigerantes" }, { name: "Organizadores" }],
  },
  {
    name: "Software",
    children: [{ name: "Sistemas Operativos" }, { name: "Antivirus" }, { name: "Office" }, { name: "Licencias" }],
  },
  {
    name: "Ofertas",
    children: [{ name: "Liquidación" }, { name: "Outlet" }, { name: "Reacondicionados" }, { name: "Últimas Unidades" }],
  },
];

async function main() {
  const { connectDB, disconnectDB } = await import("../src/lib/db");
  const { Category } = await import("../src/models/Category");
  const { Product } = await import("../src/models/Product");
  const { User } = await import("../src/models/User");
  const { getSettings } = await import("../src/models/Settings");
  const { hashPassword } = await import("../src/lib/auth/password");
  const { permissionsForRole } = await import("../src/lib/auth/permissions");
  const { slugify } = await import("../src/lib/utils");

  await connectDB();

  // Igual que con productos: si ya hay categorías, no se tocan solas al
  // volver a correr el seed (por ejemplo tras actualizar el código) — eso
  // resucitaría a mano categorías que un admin reorganizó o eliminó. Solo
  // sirve para poblar un árbol nuevo desde cero, o forzarlo explícitamente.
  const existingCategoryCount = await Category.countDocuments();
  const forceReseedCategories = process.env.SEED_FORCE_CATEGORIES === "yes";

  if (existingCategoryCount > 0 && !forceReseedCategories) {
    console.log(
      `\nℹ️  Ya hay ${existingCategoryCount} categoría(s) en la base — no se tocan. ` +
        `Para forzar el reseed del árbol de categorías, correr con SEED_FORCE_CATEGORIES=yes.\n`
    );
  } else {
    async function seedNodes(nodes: TaxonomyNode[], parentId: string | null, level: number) {
      let order = 0;
      for (const node of nodes) {
        const slug = slugify(node.name);
        const doc = await Category.findOneAndUpdate(
          { parent: parentId, slug },
          { name: node.name, slug, parent: parentId, level, order: order++, status: "activa" },
          { upsert: true, returnDocument: "after" }
        );
        if (node.children) {
          await seedNodes(node.children, String(doc._id), level + 1);
        }
      }
    }
    await seedNodes(CATEGORY_TAXONOMY, null, 1);
  }

  // Se reconstruye desde lo que quedó realmente en la base (sembrado recién
  // o preexistente) en vez de durante el upsert de arriba, así funciona
  // igual sin importar si el paso anterior corrió o se saltó.
  const allCategories = await Category.find({}).lean();
  const categoryById = new Map(allCategories.map((c) => [String(c._id), c]));
  function fullPathFor(id: string): string {
    const parts: string[] = [];
    let current = categoryById.get(id);
    while (current) {
      parts.unshift(current.name);
      current = current.parent ? categoryById.get(String(current.parent)) : undefined;
    }
    return parts.join(" > ");
  }
  const categoryIdByPath = new Map<string, string>();
  for (const c of allCategories) categoryIdByPath.set(fullPathFor(String(c._id)), String(c._id));

  const IMG = (seed: string) => `https://images.unsplash.com/photo-${seed}?q=80&w=1000&auto=format&fit=crop`;

  const products = [
    { sku: "LAP-001", name: "UltraBook Pro 14", categoryPath: "Computadoras > Notebooks > Ultrabooks", brand: "PowerTech", price: 1299, stock: 12, images: [IMG("1496181133206-80ce9b88a853")], specs: { CPU: "Intel Core i7-13700H", RAM: "16GB", Almacenamiento: "512GB SSD", Pantalla: "14'' 2.8K" }, description: "Laptop ultradelgada para productividad profesional." },
    { sku: "LAP-002", name: "Gamer Strike 16", categoryPath: "Computadoras > Notebooks > Gaming", brand: "ForgeX", price: 1899, stock: 6, images: [IMG("1603302576837-37561b2e2302")], specs: { CPU: "AMD Ryzen 9 7940H", GPU: "RTX 4070", RAM: "32GB", Almacenamiento: "1TB SSD" }, description: "Laptop gamer de alto rendimiento con refrigeración avanzada." },
    { sku: "LAP-003", name: "EcoBook Air 13", categoryPath: "Computadoras > Notebooks > Hogar", brand: "PowerTech", price: 899, stock: 20, images: [IMG("1517336714731-489689fd1ca8")], specs: { CPU: "Intel Core i5-1340P", RAM: "8GB", Almacenamiento: "256GB SSD" }, description: "Laptop ligera y eficiente para el día a día." },
    { sku: "CPU-001", name: "Procesador Ryzen 7 7800X3D", categoryPath: "Componentes de PC > Procesadores > AMD", brand: "AMD", price: 449, stock: 15, images: [IMG("1717444309226-c0809d4b5bde")], specs: { Núcleos: "8", Hilos: "16", Cache: "96MB" }, description: "Procesador líder en gaming con tecnología 3D V-Cache." },
    { sku: "GPU-001", name: "Tarjeta Gráfica RTX 4070 Ti", categoryPath: "Componentes de PC > Placas de Video > NVIDIA", brand: "NVIDIA", price: 799, stock: 8, images: [IMG("1591488320449-011701bb6704")], specs: { VRAM: "12GB GDDR6X", Interfaz: "PCIe 4.0" }, description: "Rendimiento excepcional en 1440p y 4K." },
    { sku: "MB-001", name: "Motherboard B650 Gaming", categoryPath: "Componentes de PC > Motherboards > AMD", brand: "Aorix", price: 219, stock: 18, images: [IMG("1518770660439-4636190af475")], specs: { Socket: "AM5", RAM: "DDR5" }, description: "Placa base robusta con soporte para PCIe 5.0." },
    { sku: "RAM-001", name: "Memoria RAM 32GB DDR5 6000MHz", categoryPath: "Componentes de PC > Memorias RAM > DDR5", brand: "VoltMem", price: 129, stock: 30, images: [IMG("1562976540-1502c2145186")], specs: { Capacidad: "32GB (2x16GB)", Velocidad: "6000MHz" }, description: "Kit de memoria de alto rendimiento para gaming y creación." },
    { sku: "PSU-001", name: "Fuente de Poder 850W 80+ Gold", categoryPath: "Componentes de PC > Fuentes > Modular", brand: "VoltMem", price: 139, stock: 14, images: [IMG("1587202372775-e229f172b9d7")], specs: { Potencia: "850W", Certificación: "80+ Gold" }, description: "Fuente modular eficiente y silenciosa." },
    { sku: "KEY-001", name: "Teclado Mecánico RGB Compact", categoryPath: "Periféricos > Teclados > Mecánicos", brand: "KeyForge", price: 89, stock: 40, images: [IMG("1587829741301-dc798b83add3")], specs: { Switches: "Red Lineal", Layout: "TKL" }, description: "Teclado mecánico compacto con retroiluminación RGB." },
    { sku: "MOU-001", name: "Mouse Inalámbrico Pro", categoryPath: "Periféricos > Mouse > Gaming", brand: "KeyForge", price: 59, stock: 45, images: [IMG("1527814050087-3793815479db")], specs: { DPI: "26000", Batería: "70h" }, description: "Mouse ultraligero para gaming competitivo." },
    { sku: "WEB-001", name: "Webcam 4K Streaming", categoryPath: "Periféricos > Webcams", brand: "ClearView", price: 99, stock: 22, images: [IMG("1736836977797-8035ae65c0f8")], specs: { Resolución: "4K30fps" }, description: "Webcam profesional para streaming y videollamadas." },
    { sku: "MON-001", name: "Monitor 27'' 2K 165Hz", categoryPath: "Monitores > Gaming", brand: "VisionMax", price: 329, stock: 16, images: [IMG("1527443224154-c4a3942d3acf")], specs: { Panel: "IPS", Resolución: "2560x1440", Refresco: "165Hz" }, description: "Monitor gaming de alta definición y respuesta rápida." },
    { sku: "MON-002", name: "Monitor UltraWide 34''", categoryPath: "Monitores > UltraWide", brand: "VisionMax", price: 549, stock: 9, images: [IMG("1586210579191-33b45e38fa2c")], specs: { Panel: "VA", Resolución: "3440x1440" }, description: "Ideal para productividad y creación de contenido." },
    { sku: "NET-001", name: "Router WiFi 6 Mesh", categoryPath: "Redes > Routers", brand: "NetPulse", price: 149, stock: 25, images: [IMG("1606904825846-647eb07f5be2")], specs: { Estándar: "WiFi 6", Cobertura: "300m²" }, description: "Cobertura total del hogar con tecnología mesh." },
    { sku: "NET-002", name: "Switch Gigabit 8 Puertos", categoryPath: "Redes > Switches", brand: "NetPulse", price: 39, stock: 35, images: [IMG("1544197150-b99a580bb7a8")], specs: { Puertos: "8", Velocidad: "1Gbps" }, description: "Switch plug and play para redes domésticas y oficinas." },
    { sku: "SSD-001", name: "SSD NVMe 1TB Gen4", categoryPath: "Componentes de PC > Discos > SSD NVMe", brand: "DataForge", price: 89, stock: 50, images: [IMG("1757083840018-cd665233a112")], specs: { Capacidad: "1TB", Velocidad: "7000MB/s" }, description: "Almacenamiento ultrarrápido para cargas de trabajo exigentes." },
    { sku: "HDD-001", name: "Disco Duro 4TB", categoryPath: "Componentes de PC > Discos > HDD", brand: "DataForge", price: 99, stock: 28, images: [IMG("1591370874773-6702e8f12fd8")], specs: { Capacidad: "4TB", RPM: "7200" }, description: "Almacenamiento masivo confiable para respaldo de datos." },
    { sku: "AUD-001", name: "Audífonos Gaming 7.1", categoryPath: "Periféricos > Auriculares > Gaming", brand: "SoundForge", price: 79, stock: 33, images: [IMG("1546435770-a3e426bf472b")], specs: { Sonido: "7.1 Virtual", Micrófono: "Sí" }, description: "Audio envolvente con micrófono con cancelación de ruido." },
    { sku: "AUD-002", name: "Parlante Bluetooth Portátil", categoryPath: "Audio > Parlantes", brand: "SoundForge", price: 49, stock: 40, images: [IMG("1608043152269-423dbba4e7e1")], specs: { Batería: "12h", Resistencia: "IPX7" }, description: "Sonido potente y resistente al agua para exteriores." },
    { sku: "ACC-001", name: "Hub USB-C 7 en 1", categoryPath: "Cables y Adaptadores > Adaptadores", brand: "ConnectPro", price: 45, stock: 60, images: [IMG("1591084336506-9cdca26b4c14")], specs: { Puertos: "USB-C, HDMI, USB-A x3" }, description: "Expande la conectividad de tu laptop en un solo dispositivo." },
    { sku: "ACC-002", name: "Silla Gamer Ergonómica", categoryPath: "Gaming > Sillas Gamer", brand: "ComfortSit", price: 259, stock: 10, images: [IMG("1592078615290-033ee584e267")], specs: { Material: "Cuero PU", Reclinación: "180°" }, description: "Comodidad y soporte para largas sesiones de trabajo o juego." },
  ];

  // Igual que con categorías: si ya hay productos, este seed no los toca al
  // volver a correr (por ejemplo tras actualizar el código) — eso resucitaría
  // productos que un admin/supervisor eliminó a propósito desde el panel.
  // Solo sirve para poblar un catálogo nuevo desde cero, o forzarlo explícitamente.
  const existingProductCount = await Product.countDocuments();
  const forceReseedProducts = process.env.SEED_FORCE_PRODUCTS === "yes";

  if (existingProductCount > 0 && !forceReseedProducts) {
    console.log(
      `\nℹ️  Ya hay ${existingProductCount} producto(s) en la base — no se tocan (así no se resucitan productos eliminados a mano). ` +
        `Para forzar el reseed de productos igual, correr con SEED_FORCE_PRODUCTS=yes.\n`
    );
  } else {
    for (const p of products) {
      const categoryId = categoryIdByPath.get(p.categoryPath);
      if (!categoryId) {
        console.warn(`⚠️  No se encontró la categoría "${p.categoryPath}" para el producto ${p.sku}, se omite.`);
        continue;
      }
      await Product.findOneAndUpdate(
        { sku: p.sku },
        {
          sku: p.sku,
          name: p.name,
          slug: p.sku.toLowerCase(),
          description: p.description,
          price: p.price,
          stock: p.stock,
          images: p.images,
          category: categoryId,
          brand: p.brand,
          specs: p.specs,
          status: "activo",
          featured: p.stock > 20,
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@powerit.local";
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "PowerIT#2026";

  const seedUsers = [
    { name: "Admin Power IT", email: seedAdminEmail, password: seedAdminPassword, role: "admin" as const },
    { name: "Supervisor Demo", email: "supervisor@powerit.local", password: "Supervisor#2026", role: "supervisor" as const },
    { name: "Encargado Demo", email: "encargado@powerit.local", password: "Encargado#2026", role: "encargado" as const },
    { name: "Operario Demo", email: "operario@powerit.local", password: "Operario#2026", role: "operario" as const },
    { name: "Cliente Demo", email: "cliente@powerit.local", password: "Cliente#2026", role: "cliente" as const },
  ];

  for (const u of seedUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) continue;
    const passwordHash = await hashPassword(u.password);
    await User.create({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
      permissions: permissionsForRole(u.role),
    });
  }

  await getSettings();

  console.log("\n✅ Seed completado.\n");
  console.log(`Categorías en el árbol: ${allCategories.length}`);
  console.log(`Productos: ${products.length}`);
  console.log("\nCredenciales de acceso:\n");
  for (const u of seedUsers) {
    console.log(`  ${u.role.padEnd(10)} -> ${u.email} / ${u.password}`);
  }
  console.log("");

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
