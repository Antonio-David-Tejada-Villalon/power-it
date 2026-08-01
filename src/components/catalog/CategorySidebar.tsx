"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildChildrenMap } from "@/lib/categoryHierarchy";
import type { Category } from "@/lib/types";

const VISIBLE_ROOT_LIMIT = 8;

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

const itemClass = (active: boolean) =>
  cn(
    "flex-1 text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all truncate",
    active ? "bg-primary text-white" : "hover:bg-black/5 dark:hover:bg-white/5"
  );

function CategoryNode({
  category,
  depth,
  childrenMap,
  activeCategory,
  onSelectCategory,
  expandedIds,
  onToggleExpand,
}: {
  category: Category;
  depth: number;
  childrenMap: Map<string | null, Category[]>;
  activeCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const children = childrenMap.get(category.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  return (
    <div>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: `${depth * 0.85}rem` }}>
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(category.id)}
            className="p-1.5 rounded-lg text-foreground-secondary hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Contraer" : "Expandir"}
          >
            <ChevronRight size={13} className={cn("transition-transform", isExpanded && "rotate-90")} />
          </button>
        ) : (
          <span className="w-[26px] flex-shrink-0" />
        )}
        <button onClick={() => onSelectCategory(category.id)} className={itemClass(activeCategory === category.id)}>
          {category.name}
        </button>
      </div>
      {isExpanded &&
        children.map((child) => (
          <CategoryNode
            key={child.id}
            category={child}
            depth={depth + 1}
            childrenMap={childrenMap}
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
          />
        ))}
    </div>
  );
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
  const [rootExpanded, setRootExpanded] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const specEntries = Object.entries(availableSpecs);

  const childrenMap = useMemo(() => buildChildrenMap(categories), [categories]);
  const roots = childrenMap.get(null) ?? [];
  const hasMoreRoots = roots.length > VISIBLE_ROOT_LIMIT;
  const visibleRoots = rootExpanded ? roots : roots.slice(0, VISIBLE_ROOT_LIMIT);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inputClass =
    "w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-lg outline-none transition-all text-sm";

  return (
    <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary px-3 mb-2">
          Categorías
        </h3>
        <nav className="flex flex-col gap-0.5">
          <button onClick={() => onSelectCategory(null)} className={cn(itemClass(!activeCategory), "ml-[26px]")}>
            Todas
          </button>
          {visibleRoots.map((category) => (
            <CategoryNode
              key={category.id}
              category={category}
              depth={0}
              childrenMap={childrenMap}
              activeCategory={activeCategory}
              onSelectCategory={onSelectCategory}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
            />
          ))}
          {hasMoreRoots && (
            <button
              onClick={() => setRootExpanded((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 ml-[26px] rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
            >
              {rootExpanded ? (
                <>
                  <ChevronUp size={14} />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Ver todas ({roots.length})
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
