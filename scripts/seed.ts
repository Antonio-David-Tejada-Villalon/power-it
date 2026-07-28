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

async function main() {
  const { connectDB, disconnectDB } = await import("../src/lib/db");
  const { Category } = await import("../src/models/Category");
  const { Product } = await import("../src/models/Product");
  const { User } = await import("../src/models/User");
  const { getSettings } = await import("../src/models/Settings");
  const { hashPassword } = await import("../src/lib/auth/password");
  const { permissionsForRole } = await import("../src/lib/auth/permissions");

  await connectDB();

  const categoriesData = [
    { name: "Laptops", slug: "laptops" },
    { name: "Componentes PC", slug: "componentes-pc" },
    { name: "Periféricos", slug: "perifericos" },
    { name: "Monitores", slug: "monitores" },
    { name: "Redes", slug: "redes" },
    { name: "Almacenamiento", slug: "almacenamiento" },
    { name: "Audio", slug: "audio" },
    { name: "Accesorios", slug: "accesorios" },
  ];

  const categories = new Map<string, string>();
  for (const [i, cat] of categoriesData.entries()) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { ...cat, order: i, status: "activa" },
      { upsert: true, returnDocument: 'after' }
    );
    categories.set(cat.slug, String(doc._id));
  }

  const IMG = (seed: string) => `https://images.unsplash.com/photo-${seed}?q=80&w=1000&auto=format&fit=crop`;

  const products = [
    { sku: "LAP-001", name: "UltraBook Pro 14", category: "laptops", brand: "PowerTech", price: 1299, stock: 12, images: [IMG("1496181133206-80ce9b88a853")], specs: { CPU: "Intel Core i7-13700H", RAM: "16GB", Almacenamiento: "512GB SSD", Pantalla: "14'' 2.8K" }, description: "Laptop ultradelgada para productividad profesional." },
    { sku: "LAP-002", name: "Gamer Strike 16", category: "laptops", brand: "ForgeX", price: 1899, stock: 6, images: [IMG("1603302576837-37561b2e2302")], specs: { CPU: "AMD Ryzen 9 7940H", GPU: "RTX 4070", RAM: "32GB", Almacenamiento: "1TB SSD" }, description: "Laptop gamer de alto rendimiento con refrigeración avanzada." },
    { sku: "LAP-003", name: "EcoBook Air 13", category: "laptops", brand: "PowerTech", price: 899, stock: 20, images: [IMG("1517336714731-489689fd1ca8")], specs: { CPU: "Intel Core i5-1340P", RAM: "8GB", Almacenamiento: "256GB SSD" }, description: "Laptop ligera y eficiente para el día a día." },
    { sku: "CPU-001", name: "Procesador Ryzen 7 7800X3D", category: "componentes-pc", brand: "AMD", price: 449, stock: 15, images: [IMG("1591238372338-22a6c8961e3c")], specs: { Núcleos: "8", Hilos: "16", Cache: "96MB" }, description: "Procesador líder en gaming con tecnología 3D V-Cache." },
    { sku: "GPU-001", name: "Tarjeta Gráfica RTX 4070 Ti", category: "componentes-pc", brand: "NVIDIA", price: 799, stock: 8, images: [IMG("1591488320449-011701bb6704")], specs: { VRAM: "12GB GDDR6X", Interfaz: "PCIe 4.0" }, description: "Rendimiento excepcional en 1440p y 4K." },
    { sku: "MB-001", name: "Motherboard B650 Gaming", category: "componentes-pc", brand: "Aorix", price: 219, stock: 18, images: [IMG("1518770660439-4636190af475")], specs: { Socket: "AM5", RAM: "DDR5" }, description: "Placa base robusta con soporte para PCIe 5.0." },
    { sku: "RAM-001", name: "Memoria RAM 32GB DDR5 6000MHz", category: "componentes-pc", brand: "VoltMem", price: 129, stock: 30, images: [IMG("1562976540-1502c2145186")], specs: { Capacidad: "32GB (2x16GB)", Velocidad: "6000MHz" }, description: "Kit de memoria de alto rendimiento para gaming y creación." },
    { sku: "PSU-001", name: "Fuente de Poder 850W 80+ Gold", category: "componentes-pc", brand: "VoltMem", price: 139, stock: 14, images: [IMG("1587202372775-e229f172b9d7")], specs: { Potencia: "850W", Certificación: "80+ Gold" }, description: "Fuente modular eficiente y silenciosa." },
    { sku: "KEY-001", name: "Teclado Mecánico RGB Compact", category: "perifericos", brand: "KeyForge", price: 89, stock: 40, images: [IMG("1587829741301-dc798b83add3")], specs: { Switches: "Red Lineal", Layout: "TKL" }, description: "Teclado mecánico compacto con retroiluminación RGB." },
    { sku: "MOU-001", name: "Mouse Inalámbrico Pro", category: "perifericos", brand: "KeyForge", price: 59, stock: 45, images: [IMG("1527814050087-3793815479db")], specs: { DPI: "26000", Batería: "70h" }, description: "Mouse ultraligero para gaming competitivo." },
    { sku: "WEB-001", name: "Webcam 4K Streaming", category: "perifericos", brand: "ClearView", price: 99, stock: 22, images: [IMG("1587826080692-f439465f0c3f")], specs: { Resolución: "4K30fps" }, description: "Webcam profesional para streaming y videollamadas." },
    { sku: "MON-001", name: "Monitor 27'' 2K 165Hz", category: "monitores", brand: "VisionMax", price: 329, stock: 16, images: [IMG("1527443224154-c4a3942d3acf")], specs: { Panel: "IPS", Resolución: "2560x1440", Refresco: "165Hz" }, description: "Monitor gaming de alta definición y respuesta rápida." },
    { sku: "MON-002", name: "Monitor UltraWide 34''", category: "monitores", brand: "VisionMax", price: 549, stock: 9, images: [IMG("1586210579191-33b45e38fa2c")], specs: { Panel: "VA", Resolución: "3440x1440" }, description: "Ideal para productividad y creación de contenido." },
    { sku: "NET-001", name: "Router WiFi 6 Mesh", category: "redes", brand: "NetPulse", price: 149, stock: 25, images: [IMG("1606904825846-647eb07f5be2")], specs: { Estándar: "WiFi 6", Cobertura: "300m²" }, description: "Cobertura total del hogar con tecnología mesh." },
    { sku: "NET-002", name: "Switch Gigabit 8 Puertos", category: "redes", brand: "NetPulse", price: 39, stock: 35, images: [IMG("1544197150-b99a580bb7a8")], specs: { Puertos: "8", Velocidad: "1Gbps" }, description: "Switch plug and play para redes domésticas y oficinas." },
    { sku: "SSD-001", name: "SSD NVMe 1TB Gen4", category: "almacenamiento", brand: "DataForge", price: 89, stock: 50, images: [IMG("1531492746076-161ba9bbeb50")], specs: { Capacidad: "1TB", Velocidad: "7000MB/s" }, description: "Almacenamiento ultrarrápido para cargas de trabajo exigentes." },
    { sku: "HDD-001", name: "Disco Duro 4TB", category: "almacenamiento", brand: "DataForge", price: 99, stock: 28, images: [IMG("1591370874773-6702e8f12fd8")], specs: { Capacidad: "4TB", RPM: "7200" }, description: "Almacenamiento masivo confiable para respaldo de datos." },
    { sku: "AUD-001", name: "Audífonos Gaming 7.1", category: "audio", brand: "SoundForge", price: 79, stock: 33, images: [IMG("1546435770-a3e426bf472b")], specs: { Sonido: "7.1 Virtual", Micrófono: "Sí" }, description: "Audio envolvente con micrófono con cancelación de ruido." },
    { sku: "AUD-002", name: "Parlante Bluetooth Portátil", category: "audio", brand: "SoundForge", price: 49, stock: 40, images: [IMG("1608043152269-423dbba4e7e1")], specs: { Batería: "12h", Resistencia: "IPX7" }, description: "Sonido potente y resistente al agua para exteriores." },
    { sku: "ACC-001", name: "Hub USB-C 7 en 1", category: "accesorios", brand: "ConnectPro", price: 45, stock: 60, images: [IMG("1591290619762-c1e5a0301c47")], specs: { Puertos: "USB-C, HDMI, USB-A x3" }, description: "Expande la conectividad de tu laptop en un solo dispositivo." },
    { sku: "ACC-002", name: "Silla Gamer Ergonómica", category: "accesorios", brand: "ComfortSit", price: 259, stock: 10, images: [IMG("1592078615290-033ee584e267")], specs: { Material: "Cuero PU", Reclinación: "180°" }, description: "Comodidad y soporte para largas sesiones de trabajo o juego." },
  ];

  for (const p of products) {
    const categoryId = categories.get(p.category);
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
      { upsert: true, returnDocument: 'after' }
    );
  }

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@powerit.local";
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "PowerIT#2026";

  const seedUsers = [
    { name: "Admin Power IT", email: seedAdminEmail, password: seedAdminPassword, role: "admin" as const },
    { name: "Supervisor Demo", email: "supervisor@powerit.local", password: "Supervisor#2026", role: "supervisor" as const },
    { name: "Encargado Demo", email: "encargado@powerit.local", password: "Encargado#2026", role: "encargado" as const },
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
  console.log(`Categorías: ${categoriesData.length}`);
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
