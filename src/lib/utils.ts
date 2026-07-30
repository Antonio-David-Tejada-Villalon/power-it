import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?(#.*)?$/i;

/** Acepta cualquier host, siempre que sea https y la ruta termine en una
 * extensión de imagen conocida (jpg, png, gif, webp, avif, svg). */
export function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return IMAGE_EXTENSION_PATTERN.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

// Prudencial para una descripción de producto: alcanza para un párrafo y
// varios puntos en viñeta, sin dar pie a que se cargue un texto kilométrico.
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 1000;

// Sin esto, un producto podría cargar (a mano o por importación masiva) un
// mapa de specs arbitrariamente grande — sin romper nada hoy, pero sin
// ningún límite tampoco (DATA-02).
export const MAX_SPECS_COUNT = 30;
export const MAX_SPEC_KEY_LENGTH = 60;
export const MAX_SPEC_VALUE_LENGTH = 300;

export function isValidSpecs(specs: Record<string, string>): boolean {
  const entries = Object.entries(specs);
  if (entries.length > MAX_SPECS_COUNT) return false;
  return entries.every(([key, value]) => key.length <= MAX_SPEC_KEY_LENGTH && value.length <= MAX_SPEC_VALUE_LENGTH);
}

const FORMULA_TRIGGER_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Neutraliza CSV/Excel injection (CWE-1236): si un valor de celda empieza
 * con un caracter que Excel/Sheets podría interpretar como el inicio de una
 * fórmula al abrir el archivo, se le antepone una comilla simple para forzar
 * texto literal — el mismo mecanismo que usa Excel para "escapar" celdas. */
export function sanitizeSpreadsheetCell(value: string): string {
  if (value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0])) {
    return `'${value}`;
  }
  return value;
}
