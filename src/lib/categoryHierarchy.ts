import type { Category } from "@/lib/types";

// Única fuente de verdad para el tope de profundidad — usada tanto en el
// modelo/API (servidor) como en los componentes de árbol (cliente), sin que
// el cliente tenga que importar nada de mongoose.
export const MAX_CATEGORY_LEVEL = 3;

export const CATEGORY_LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Categoría",
  2: "Subcategoría",
  3: "Familia",
};

/** Funciones puras sobre el listado plano de categorías — sin llamadas a la
 * base, así se pueden reusar tanto en el árbol del admin como en el sidebar
 * del catálogo público, ambos ya con el listado completo en memoria. */

export function buildChildrenMap(categories: Category[]): Map<string | null, Category[]> {
  const map = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parent;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(category);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }
  return map;
}

export function getDescendantIds(categoryId: string, childrenMap: Map<string | null, Category[]>): Set<string> {
  const result = new Set<string>();
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenMap.get(current) ?? []) {
      result.add(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

/** Camino completo desde la raíz hasta `categoryId` (incluido) — se usa para
 * pre-seleccionar los 3 selects en cascada del formulario de producto. */
export function getAncestorChain(categoryId: string, categoriesById: Map<string, Category>): Category[] {
  const chain: Category[] = [];
  let current = categoriesById.get(categoryId);
  while (current) {
    chain.unshift(current);
    current = current.parent ? categoriesById.get(current.parent) : undefined;
  }
  return chain;
}

/** true si la categoría del producto es exactamente `filterId` o cualquiera
 * de sus descendientes — así elegir "Notebooks" en el catálogo también
 * muestra productos cargados en "Gaming", "Hogar", etc. debajo de esa rama. */
export function categoryMatchesFilter(
  productCategoryId: string,
  filterId: string,
  categoriesById: Map<string, Category>
): boolean {
  let current: string | undefined = productCategoryId;
  while (current) {
    if (current === filterId) return true;
    current = categoriesById.get(current)?.parent ?? undefined;
  }
  return false;
}
