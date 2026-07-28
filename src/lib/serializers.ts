import type { ClientUser, Product, Category, Order } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeanDoc = any;

export function toClientUser(doc: LeanDoc): ClientUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    permissions: doc.permissions ?? [],
    status: doc.status,
    phone: doc.phone,
    createdAt: doc.createdAt?.toISOString?.(),
  };
}

export function toClientCategory(doc: LeanDoc): Category {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    image: doc.image,
    status: doc.status,
  };
}

export function toClientProduct(doc: LeanDoc): Product {
  const category = doc.category
    ? typeof doc.category === "object" && doc.category.name
      ? { id: String(doc.category._id), name: doc.category.name, slug: doc.category.slug }
      : String(doc.category)
    : "";

  return {
    id: String(doc._id),
    sku: doc.sku,
    isbn: doc.isbn,
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    price: doc.price,
    compareAtPrice: doc.compareAtPrice,
    stock: doc.stock,
    images: doc.images ?? [],
    category,
    brand: doc.brand,
    specs: doc.specs instanceof Map ? Object.fromEntries(doc.specs) : doc.specs ?? {},
    status: doc.status,
    featured: doc.featured,
  };
}

export function toClientOrder(doc: LeanDoc): Order {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    customer: {
      user: doc.customer?.user ? String(doc.customer.user) : null,
      name: doc.customer?.name,
      email: doc.customer?.email,
      phone: doc.customer?.phone,
    },
    items: (doc.items ?? []).map((item: LeanDoc) => ({
      product: String(item.product),
      sku: item.sku,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    subtotal: doc.subtotal,
    total: doc.total,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    assignedTo: doc.assignedTo ? String(doc.assignedTo) : undefined,
    notes: doc.notes,
    source: doc.source,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
