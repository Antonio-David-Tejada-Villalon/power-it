"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";

export interface CartItem extends Product {
  cantidad: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  }, [cart]);

  const addToCart = (product: Product, cantidad: number) => {
    if (cantidad <= 0) return;

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
  };
};
