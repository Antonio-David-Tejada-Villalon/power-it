"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Info, Plus, Minus, ShoppingCart, PackageX } from "lucide-react";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product, cantidad: number) => void;
  onShowDetails: (product: Product) => void;
}

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

export const ProductCard = ({ product, onAdd, onShowDetails }: ProductCardProps) => {
  const [cantidad, setCantidad] = useState(1);
  const outOfStock = product.status === "agotado" || product.stock === 0;
  const imageUrl = product.images[0] ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop";
  const categoryName = typeof product.category === "object" ? product.category.name : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl overflow-hidden group border border-[color:var(--glass-border)] shadow-[var(--card-shadow)]"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            outOfStock ? "grayscale opacity-40" : ""
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-md border border-danger/30 rounded-full shadow-xl"
            >
              <PackageX size={16} className="text-danger" />
              <span className="text-sm font-bold tracking-wide text-danger">Agotado</span>
            </motion.div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <button
            onClick={() => onShowDetails(product)}
            className="w-full py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
          >
            <Info size={16} />
            Ver Detalles
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div>
          {categoryName && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              {categoryName}
            </p>
          )}
          <h3 className="font-heading font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-foreground-secondary">{product.brand ?? product.sku}</p>
        </div>

        <p className="text-xl font-bold font-heading">{currency.format(product.price)}</p>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div
            className="flex items-center bg-black/5 dark:bg-white/5 rounded-full p-1"
            title="Cantidad a pedir / stock disponible"
          >
            <button
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={outOfStock}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus size={14} />
            </button>
            <span className="w-12 text-center text-sm font-medium tabular-nums">
              {cantidad}
              <span className="text-foreground-secondary">/{product.stock}</span>
            </span>
            <button
              onClick={() => setCantidad((c) => Math.min(Math.max(product.stock, 1), c + 1))}
              disabled={outOfStock || cantidad >= product.stock}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={() => onAdd(product, cantidad)}
            disabled={outOfStock}
            className="flex-1 bg-primary text-white py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            Agregar
          </button>
        </div>
      </div>
    </motion.div>
  );
};
