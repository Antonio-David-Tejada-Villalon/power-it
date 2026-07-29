import { Order } from "@/models/Order";

/**
 * Al loguearse/registrarse (o vincular Google), reclama cualquier pedido
 * hecho como invitado con el mismo email — así "Mis pedidos" muestra el
 * historial completo aunque esos pedidos se hayan creado antes de tener
 * cuenta. Comparación insensible a mayúsculas (el email de un pedido de
 * invitado se guarda tal cual lo tipeó el cliente, no siempre en minúsculas).
 */
export async function linkGuestOrdersToUser(userId: string, email: string): Promise<number> {
  const result = await Order.updateMany(
    { "customer.user": null, "customer.email": email },
    { $set: { "customer.user": userId } },
    { collation: { locale: "en", strength: 2 } }
  );
  return result.modifiedCount;
}
