"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

const VISIBLE_LIMIT = 5;

interface CategorySidebarProps {
  categories: Category[];
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  showRefineFilters: boolean;
  availableSpecs: Record<string, string[]>;
  specFilters: Record<string, string[]>;
  onToggleSpecValue: (key: string, value: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  priceBounds: { min: number; max: number };
  onClearRefineFilters: () => void;
  hasActiveRefineFilters: boolean;
}

export function CategorySidebar({
  categories,
  activeCategory,
  onSelectCategory,
  showRefineFilters,
  availableSpecs,
  specFilters,
  onToggleSpecValue,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  priceBounds,
  onClearRefineFilters,
  hasActiveRefineFilters,
}: CategorySidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = categories.length > VISIBLE_LIMIT;
  const visibleCategories = expanded ? categories : categories.slice(0, VISIBLE_LIMIT);
  const specEntries = Object.entries(availableSpecs);

  const itemClass = (active: boolean) =>
    cn(
      "w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
      active ? "bg-primary text-white" : "hover:bg-black/5 dark:hover:bg-white/5"
    );

  const inputClass =
    "w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-lg outline-none transition-all text-sm";

  return (
    <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary px-4 mb-2">
          Categorías
        </h3>
        <nav className="flex flex-row md:flex-col flex-wrap gap-1.5 md:gap-1">
          <button onClick={() => onSelectCategory(null)} className={itemClass(!activeCategory)}>
            Todas
          </button>
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={itemClass(activeCategory === category.id)}
            >
              {category.name}
            </button>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Ver todas ({categories.length})
                </>
              )}
            </button>
          )}
        </nav>
      </div>

      <AnimatePresence>
        {showRefineFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-6"
          >
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary flex items-center gap-1.5">
                <SlidersHorizontal size={12} />
                Afinar búsqueda
              </h3>
              {hasActiveRefineFilters && (
                <button
                  onClick={onClearRefineFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger/80"
                >
                  <X size={12} />
                  Limpiar
                </button>
              )}
            </div>

            <div className="px-4 space-y-2">
              <p className="text-xs font-semibold text-foreground-secondary">Precio</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder={`${priceBounds.min}`}
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  className={inputClass}
                />
                <span className="text-foreground-secondary text-xs">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder={`${priceBounds.max}`}
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {specEntries.map(([key, values]) => (
              <div key={key} className="px-4 space-y-2">
                <p className="text-xs font-semibold text-foreground-secondary">{key}</p>
                <div className="space-y-1.5">
                  {values.map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={specFilters[key]?.includes(value) ?? false}
                        onChange={() => onToggleSpecValue(key, value)}
                        className="accent-primary"
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
