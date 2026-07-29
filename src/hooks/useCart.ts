"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Product } from "@/lib/types";

export interface CartItem extends Product {
  cantidad: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Id del usuario con el que ya se sincronizó el carrito guardado en esta
  // sesión — evita re-mergear en cada render y evita persistir al servidor
  // mientras el visitante todavía es un invitado (sin cuenta).
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      // Hidratación post-mount intencional: localStorage no existe en SSR,
      // así que el carrito debe llegar vacío en el render inicial.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    if (syncedUserId.current) {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((item) => ({ productId: item.id, quantity: item.cantidad })) }),
      }).catch(() => {
        // Best-effort: si falla, el carrito local sigue funcionando igual.
      });
    }
  }, [cart]);

  /** Se llama una vez que se sabe que hay una cuenta logueada (cliente). Trae
   * el carrito guardado en el servidor y lo combina con el local (sumando
   * cantidades de los productos en común), sin perder nada de ningún lado. */
  const syncWithAccount = useCallback(async (userId: string) => {
    if (syncedUserId.current === userId) return;
    syncedUserId.current = userId;

    try {
      const res = await fetch("/api/cart");
      if (!res.ok) return;
      const data = await res.json();
      const serverItems: CartItem[] = data.items ?? [];
      if (serverItems.length === 0) return;

      setCart((prev) => {
        const merged = [...prev];
        for (const serverItem of serverItems) {
          const idx = merged.findIndex((item) => item.id === serverItem.id);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], cantidad: merged[idx].cantidad + serverItem.cantidad };
          } else {
            merged.push(serverItem);
          }
        }
        return merged;
      });
    } catch {
      // Sin conexión con el servidor: el carrito local sigue funcionando igual.
    }
  }, []);

  /** Un mismo pedido no puede mezclar monedas (el total dejaría de tener
   * sentido). Si el carrito ya tiene productos de otra moneda, se rechaza el
   * agregado y se avisa cuál es la moneda vigente del carrito. */
  const addToCart = (product: Product, cantidad: number): { ok: true } | { ok: false; error: string } => {
    if (cantidad <= 0) return { ok: false, error: "Cantidad inválida" };

    const cartCurrency = cart[0]?.currency;
    if (cartCurrency && cartCurrency !== product.currency) {
      return {
        ok: false,
        error: `Tu carrito ya tiene productos en ${cartCurrency}. No se pueden combinar monedas distintas en un mismo pedido — vaciá el carrito o finalizá ese pedido primero.`,
      };
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, cantidad: item.cantidad + cantidad } : item
        );
      }
      return [...prev, { ...product, cantidad }];
    });
    setIsSidebarOpen(true);
    return { ok: true };
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, cantidad: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad } : item)).filter((item) => item.cantidad > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isSidebarOpen,
    setIsSidebarOpen,
    syncWithAccount,
  };
};
