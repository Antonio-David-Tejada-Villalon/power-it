import type { Role } from "@/models/User";

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  status: "active" | "suspended";
  phone?: string;
  createdAt?: string;
  canApproveOwnEdits?: boolean;
}

export interface UserEditRequestChanges {
  name?: string;
  role?: Role;
  status?: "active" | "suspended";
  password?: boolean;
}

export interface UserEditRequest {
  id: string;
  targetUser: { id: string; name: string; email: string; role: Role };
  requestedBy: { id: string; name: string; email: string; role: Role };
  changes: UserEditRequestChanges;
  reason: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  reviewedBy?: { id: string; name: string; email: string } | null;
  reviewReason?: string;
  reviewedAt?: string;
  canReview: boolean;
  isMine: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  isbn?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images: string[];
  category: { id: string; name: string; slug: string } | string;
  brand?: string;
  specs: Record<string, string>;
  status: "activo" | "agotado" | "descontinuado";
  featured: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: "activa" | "inactiva";
}

export interface OrderItem {
  product: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: { user?: string | null; name: string; email: string; phone?: string };
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  paymentStatus: string;
  assignedTo?: string;
  notes?: string;
  source: "web" | "admin";
  createdAt: string;
}
