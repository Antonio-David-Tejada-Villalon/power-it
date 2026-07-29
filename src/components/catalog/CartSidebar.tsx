"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import Image from "next/image";
import type { CartItem } from "@/hooks/useCart";
import { formatPrice } from "@/lib/currency";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, cantidad: number) => void;
  onCheckout: () => void;
}

export const CartSidebar = ({
  isOpen,
  onClose,
  items,
  onRemove,
  onUpdateQuantity,
  onCheckout,
}: CartSidebarProps) => {
  const total = items.reduce((acc, item) => acc + item.price * item.cantidad, 0);
  // Todos los items del carrito comparten moneda (useCart lo garantiza al agregar).
  const cartCurrency = items[0]?.currency ?? "USD";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background/95 backdrop-blur-2xl border-l border-[color:var(--glass-border)] z-[90] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-[color:var(--glass-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl text-white">
                  <ShoppingBag size={20} />
                </div>
                <h2 className="font-heading text-xl font-bold">Resumen de Pedido</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-foreground-secondary space-y-4">
                  <ShoppingBag size={48} />
                  <p className="text-lg">Tu carrito está vacío</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4 p-4 glass rounded-2xl relative group"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface">
                      <Image
                        src={item.images[0] ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop"}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                        <p className="text-xs text-foreground-secondary">{formatPrice(item.price, item.currency)}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-full px-2 py-1">
                          <button onClick={() => onUpdateQuantity(item.id, item.cantidad - 1)} className="p-1">
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.cantidad}</span>
                          <button onClick={() => onUpdateQuantity(item.id, item.cantidad + 1)} className="p-1">
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-xs font-bold">{formatPrice(item.price * item.cantidad, item.currency)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemove(item.id)}
                      className="absolute -top-2 -right-2 p-1.5 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 glass-dark rounded-t-[2rem] space-y-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total, cartCurrency)}</span>
                </div>
                <button
                  onClick={onCheckout}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20"
                >
                  Continuar Pedido
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
