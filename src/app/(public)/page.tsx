"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, ArrowRight, HelpCircle, LayoutDashboard, LogIn, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, Category, ClientUser } from "@/lib/types";
import { useCart } from "@/hooks/useCart";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CategorySidebar } from "@/components/catalog/CategorySidebar";
import { DeveloperCredit } from "@/components/catalog/DeveloperCredit";
import { ProductDetailModal } from "@/components/catalog/ProductDetailModal";
import { CartSidebar } from "@/components/catalog/CartSidebar";
import { ExportModal } from "@/components/catalog/ExportModal";
import { HelpModal } from "@/components/catalog/HelpModal";
import { CheckoutOptionsModal } from "@/components/catalog/CheckoutOptionsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import Link from "next/link";
import type { Currency, RateTable } from "@/lib/currency";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contactEmail, setContactEmail] = useState("ventas@powerit.local");
  const [visitorCurrency, setVisitorCurrency] = useState<Currency | undefined>(undefined);
  const [rates, setRates] = useState<RateTable | undefined>(undefined);
  const [user, setUser] = useState<ClientUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({});
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCheckoutOptionsOpen, setIsCheckoutOptionsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, isSidebarOpen, setIsSidebarOpen, syncWithAccount } =
    useCart();
  useSessionKeepAlive(Boolean(user));

  // El buscador/filtros del catálogo trabajan en memoria sobre el listado
  // completo (specs disponibles, rango de precio, etc.), así que acá se trae
  // el catálogo entero paginando contra el servidor en vez de cortar en el
  // límite de 100 de la primera página — si no, un catálogo que creciera más
  // allá de eso perdería productos en silencio.
  const MAX_CATALOG_PAGES = 20;
  const loadProducts = () => {
    fetch("/api/products?limit=100&page=1")
      .then((res) => res.json())
      .then((first) => {
        const items: Product[] = first.items ?? [];
        const totalPages = Math.min(first.pages ?? 1, MAX_CATALOG_PAGES);
        if (totalPages <= 1) {
          setProducts(items);
          return;
        }
        Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(`/api/products?limit=100&page=${i + 2}`).then((res) => res.json())
          )
        ).then((rest) => {
          for (const page of rest) items.push(...(page.items ?? []));
          setProducts(items);
        });
      });
  };

  useEffect(() => {
    loadProducts();
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.items ?? []));
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => data.settings?.contactEmail && setContactEmail(data.settings.contactEmail));
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return;
        setUser(data.user);
        if (data.user.role === "cliente") {
          syncWithAccount(data.user.id);
        }
      });
    fetch("/api/currency")
      .then((res) => res.json())
      .then((data) => {
        setVisitorCurrency(data.currency);
        setRates(data.rates);
      });
  }, [syncWithAccount]);

  // Etapa 1: por texto de búsqueda + categoría. De este subconjunto se derivan
  // las especificaciones y el rango de precio disponibles para afinar la búsqueda.
  const searchCategoryFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        (product.brand ?? "").toLowerCase().includes(term);
      const categoryId = typeof product.category === "object" ? product.category.id : product.category;
      const matchesCategory = !activeCategory || categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const showRefineFilters = activeCategory !== null || searchTerm.trim() !== "";

  const availableSpecs = useMemo(() => {
    const collected: Record<string, Set<string>> = {};
    for (const product of searchCategoryFiltered) {
      for (const [key, value] of Object.entries(product.specs ?? {})) {
        if (!value) continue;
        if (!collected[key]) collected[key] = new Set();
        collected[key].add(value);
      }
    }
    const result: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(collected)) {
      result[key] = Array.from(values).sort();
    }
    return result;
  }, [searchCategoryFiltered]);

  const priceBounds = useMemo(() => {
    if (searchCategoryFiltered.length === 0) return { min: 0, max: 0 };
    let min = Infinity;
    let max = -Infinity;
    for (const product of searchCategoryFiltered) {
      if (product.price < min) min = product.price;
      if (product.price > max) max = product.price;
    }
    return { min: Math.floor(min), max: Math.ceil(max) };
  }, [searchCategoryFiltered]);

  // Etapa 2: afinado por especificaciones y precio elegidos en el sidebar.
  const filteredProducts = useMemo(() => {
    return searchCategoryFiltered.filter((product) => {
      for (const [key, values] of Object.entries(specFilters)) {
        if (values.length === 0) continue;
        if (!values.includes(product.specs?.[key] ?? "")) return false;
      }
      if (priceMin !== "" && product.price < Number(priceMin)) return false;
      if (priceMax !== "" && product.price > Number(priceMax)) return false;
      return true;
    });
  }, [searchCategoryFiltered, specFilters, priceMin, priceMax]);

  const hasActiveRefineFilters = Object.keys(specFilters).length > 0 || priceMin !== "" || priceMax !== "";

  const toggleSpecFilter = (key: string, value: string) => {
    setSpecFilters((prev) => {
      const current = prev[key] ?? [];
      const nextValues = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const next = { ...prev };
      if (nextValues.length === 0) delete next[key];
      else next[key] = nextValues;
      return next;
    });
    setCurrentPage(1);
  };

  const clearRefineFilters = () => {
    setSpecFilters({});
    setPriceMin("");
    setPriceMax("");
    setCurrentPage(1);
  };

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  // BIZ-03: 4 productos de la misma categoría, sin depender de ningún modelo
  // nuevo — ya tenemos el catálogo completo cargado en memoria (QA-02).
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    const categoryId =
      typeof selectedProduct.category === "object" ? selectedProduct.category.id : selectedProduct.category;
    return products
      .filter((p) => {
        if (p.id === selectedProduct.id) return false;
        const pCategoryId = typeof p.category === "object" ? p.category.id : p.category;
        return pCategoryId === categoryId;
      })
      .slice(0, 4);
  }, [products, selectedProduct]);

  const handleExport = async (fileName: string, type: "excel" | "pdf") => {
    if (type === "excel") {
      await exportToExcel(cart, fileName);
    } else {
      await exportToPDF(cart, fileName, contactEmail);
    }
    setIsExportOpen(false);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-white">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-[color:var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center flex-shrink-0">
            <Logo priority className="h-9 w-auto object-contain" />
          </div>

          <div className="flex-1 max-w-lg relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary group-focus-within:text-primary transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, marca o descripción..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                setCurrentPage(1);
                if (value.trim() === "" && activeCategory === null) {
                  setSpecFilters({});
                  setPriceMin("");
                  setPriceMax("");
                }
              }}
              className="w-full pl-12 pr-6 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/50 focus:bg-background rounded-full outline-none transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && user.role !== "cliente" && (
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-3 glass rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-semibold"
              >
                <LayoutDashboard size={18} className="text-primary" />
                Panel
              </Link>
            )}
            {user && user.role === "cliente" && (
              <Link
                href="/mi-cuenta/pedidos"
                className="hidden sm:flex items-center gap-2 px-4 py-3 glass rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-semibold"
              >
                <Package size={18} className="text-primary" />
                Mis pedidos
              </Link>
            )}
            {!user && (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 px-4 py-3 glass rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all text-sm font-semibold"
              >
                <LogIn size={18} className="text-primary" />
                Acceder
              </Link>
            )}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="relative p-3 glass rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all group"
            >
              <ShoppingBag size={24} className="group-hover:scale-110 transition-transform text-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg border-2 border-background">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10">
          {categories.length > 0 && (
            <CategorySidebar
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={(id) => {
                setActiveCategory(id);
                setCurrentPage(1);
                if (id === null && searchTerm.trim() === "") {
                  setSpecFilters({});
                  setPriceMin("");
                  setPriceMax("");
                }
              }}
              showRefineFilters={showRefineFilters}
              availableSpecs={availableSpecs}
              specFilters={specFilters}
              onToggleSpecValue={toggleSpecFilter}
              priceMin={priceMin}
              priceMax={priceMax}
              onPriceMinChange={(v) => {
                setPriceMin(v);
                setCurrentPage(1);
              }}
              onPriceMaxChange={(v) => {
                setPriceMax(v);
                setCurrentPage(1);
              }}
              priceBounds={priceBounds}
              onClearRefineFilters={clearRefineFilters}
              hasActiveRefineFilters={hasActiveRefineFilters}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <h2 className="font-heading text-4xl md:text-5xl font-black tracking-tighter">
                  Tecnología que impulsa tu mundo
                </h2>
                <p className="text-lg text-foreground-secondary">
                  Descubre {products.length}+ productos de tecnología de última generación.
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "resultado" : "resultados"}
                </span>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <>
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={addToCart}
                        onShowDetails={handleShowDetails}
                        visitorCurrency={visitorCurrency}
                        rates={rates}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>

                {totalPages > 1 && (
                  <div className="mt-16 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2 p-2 glass rounded-[2rem]">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-3 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all"
                      >
                        <ArrowRight className="rotate-180" size={20} />
                      </button>

                      <div className="flex items-center px-4 gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                          const page = i + 1;
                          if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "w-10 h-10 rounded-full text-sm font-bold transition-all",
                                  currentPage === page
                                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                                    : "hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                              >
                                {page}
                              </button>
                            );
                          }
                          if (page === 2 || page === totalPages - 1) {
                            return (
                              <span key={page} className="px-1 opacity-30">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-3 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                    <p className="text-sm text-foreground-secondary font-medium">
                      Página {currentPage} de {totalPages}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-32 text-center space-y-4">
                <div className="inline-flex p-6 rounded-[2.5rem] bg-black/5 dark:bg-white/5 text-foreground-secondary">
                  <Search size={48} />
                </div>
                <h3 className="text-2xl font-bold">No encontramos lo que buscas</h3>
                <p className="text-foreground-secondary">
                  Prueba con otras palabras clave, cambia de categoría o ajusta los filtros del sidebar.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[color:var(--glass-border)] py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-sm text-foreground-secondary font-medium">
            © 2026 Power IT. Todos los derechos reservados.
          </p>
          <DeveloperCredit />
        </div>
      </footer>

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onAdd={addToCart}
        visitorCurrency={visitorCurrency}
        rates={rates}
        relatedProducts={relatedProducts}
        onSelectRelated={handleShowDetails}
      />

      <CartSidebar
        items={cart}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onCheckout={() => {
          setIsSidebarOpen(false);
          setIsCheckoutOptionsOpen(true);
        }}
      />

      <CheckoutOptionsModal
        isOpen={isCheckoutOptionsOpen}
        onClose={() => setIsCheckoutOptionsOpen(false)}
        items={cart}
        contactEmail={contactEmail}
        onExport={(type) => handleExport("Solicitud_Presupuesto", type)}
        onOrderPlaced={() => {
          clearCart();
          loadProducts();
        }}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onExport={handleExport} />

      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <HelpCircle size={24} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute right-full mr-4 px-3 py-1 bg-background/80 backdrop-blur-md border border-[color:var(--glass-border)] rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          ¿Necesitas ayuda?
        </span>
      </button>
    </div>
  );
}
