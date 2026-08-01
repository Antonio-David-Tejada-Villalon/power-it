import { Category } from "@/models/Category";
import { MAX_CATEGORY_LEVEL } from "@/lib/categoryHierarchy";

export class CategoryTreeError extends Error {}

/** El nivel nunca se acepta del cliente: siempre se deriva del padre real en
 * la base, así el árbol no puede quedar inconsistente por un valor manual. */
export async function resolveLevelForParent(parentId: string | null): Promise<number> {
  if (!parentId) return 1;
  const parent = await Category.findById(parentId).select("level").lean();
  if (!parent) throw new CategoryTreeError("La categoría padre no existe");
  if (parent.level >= MAX_CATEGORY_LEVEL) {
    throw new CategoryTreeError(`No se pueden crear más de ${MAX_CATEGORY_LEVEL} niveles de categorías`);
  }
  return parent.level + 1;
}

/** true si `maybeDescendantId` es `rootId` o está en su subárbol — usado para
 * evitar que re-parentar una categoría la convierta en su propio ancestro. */
export async function isSameOrDescendant(maybeDescendantId: string, rootId: string): Promise<boolean> {
  if (maybeDescendantId === rootId) return true;
  let current = await Category.findById(maybeDescendantId).select("parent").lean();
  while (current?.parent) {
    if (String(current.parent) === rootId) return true;
    current = await Category.findById(current.parent).select("parent").lean();
  }
  return false;
}

/** Profundidad del subárbol propio (1 = sin hijos, 2 = tiene hijos pero no
 * nietos, etc.) — se usa para rechazar un re-parenting que empujaría a los
 * descendientes de esta categoría más allá del nivel máximo permitido. */
export async function getSubtreeDepth(categoryId: string): Promise<number> {
  const children = await Category.find({ parent: categoryId }).select("_id").lean();
  if (children.length === 0) return 1;
  const depths = await Promise.all(children.map((child) => getSubtreeDepth(String(child._id))));
  return 1 + Math.max(...depths);
}

/** Tras cambiar el padre de una categoría, sus descendientes (si tiene) deben
 * recalcular su `level` en cascada para seguir reflejando su profundidad real. */
export async function recomputeDescendantLevels(categoryId: string, newLevel: number): Promise<void> {
  const children = await Category.find({ parent: categoryId }).select("_id").lean();
  for (const child of children) {
    const childId = String(child._id);
    await Category.findByIdAndUpdate(childId, { level: newLevel + 1 });
    await recomputeDescendantLevels(childId, newLevel + 1);
  }
}
