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
