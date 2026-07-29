"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, ShoppingCart } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatPrice, convertAmount, type Currency, type RateTable } from "@/lib/currency";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product, cantidad: number) => { ok: true } | { ok: false; error: string };
  visitorCurrency?: Currency;
  rates?: RateTable;
  relatedProducts?: Product[];
  onSelectRelated?: (product: Product) => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop";

export const ProductDetailModal = ({
  product,
  isOpen,
  onClose,
  onAdd,
  visitorCurrency,
  rates,
  relatedProducts,
  onSelectRelated,
}: ProductDetailModalProps) => {
  const [cartError, setCartError] = useState<string | null>(null);
  if (!product) return null;

  const imageUrl = product.images[0] ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop";
  const categoryName = typeof product.category === "object" ? product.category.name : undefined;
  const specs = Object.entries(product.specs ?? {});

  const showConverted = visitorCurrency && rates && visitorCurrency !== product.currency;
  const convertedPrice = showConverted ? convertAmount(product.price, product.currency, visitorCurrency, rates) : null;

  const handleAdd = () => {
    const result = onAdd(product, 1);
    if (result.ok) {
      onClose();
    } else {
      setCartError(result.error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-background/95 backdrop-blur-xl border border-[color:var(--glass-border)] rounded-[2rem] shadow-2xl z-[60] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-[70]"
            >
              <X size={20} />
            </button>

            <div className="relative w-full md:w-2/5 aspect-square md:aspect-auto h-64 md:h-auto overflow-hidden bg-surface">
              <Image src={imageUrl} alt={product.name} fill unoptimized className="object-cover" />
            </div>

            <div className="flex-1 p-8 md:p-10 flex flex-col justify-start overflow-y-auto space-y-6">
              <div className="space-y-3">
                {categoryName && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                    <Cpu size={14} />
                    {categoryName}
                  </div>
                )}

                <h2 className="font-heading text-3xl md:text-4xl font-bold leading-tight">{product.name}</h2>
                <p className="text-foreground-secondary">{product.brand ?? product.sku}</p>
                <div>
                  <p className="font-heading text-3xl font-bold text-primary">
                    {formatPrice(convertedPrice ?? product.price, showConverted ? visitorCurrency! : product.currency)}
                  </p>
                  {showConverted && (
                    <p className="text-xs text-foreground-secondary mt-1">
                      ≈ {formatPrice(product.price, product.currency)} · precio de referencia, puede variar
                    </p>
                  )}
                </div>

                <div className="w-12 h-1 bg-primary/30 rounded-full" />

                <p className="text-base leading-relaxed text-foreground-secondary">{product.description}</p>
              </div>

              {specs.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {specs.map(([key, value]) => (
                    <div key={key} className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                      <p className="text-xs uppercase tracking-wide text-foreground-secondary">{key}</p>
                      <p className="text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {cartError && <p className="text-sm text-danger">{cartError}</p>}
              <button
                onClick={handleAdd}
                disabled={product.status === "agotado" || product.stock === 0}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                <ShoppingCart size={18} />
                {product.stock === 0 ? "Sin stock" : "Agregar al pedido"}
              </button>

              {relatedProducts && relatedProducts.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[color:var(--glass-border)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
                    También te puede interesar
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {relatedProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectRelated?.(p)}
                        className="text-left p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface mb-2">
                          <Image src={p.images[0] ?? FALLBACK_IMAGE} alt={p.name} fill unoptimized className="object-cover" />
                        </div>
                        <p className="text-xs font-semibold line-clamp-2">{p.name}</p>
                        <p className="text-xs text-primary font-bold">{formatPrice(p.price, p.currency)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
