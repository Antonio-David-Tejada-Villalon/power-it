"use client";

import * as XLSX from "xlsx";
import { saveFile } from "@/lib/exportUtils";
import { CURRENCIES } from "@/lib/currency";
import { sanitizeSpreadsheetCell } from "@/lib/utils";
import type { Product, Category } from "@/lib/types";

export const IMPORT_HEADERS = [
  "SKU",
  "ISBN",
  "Nombre",
  "Slug",
  "Descripcion",
  "Precio",
  "Moneda",
  "PrecioComparacion",
  "Stock",
  "Categoria",
  "Marca",
  "Imagenes",
  "Especificaciones",
  "Estado",
  "Destacado",
] as const;

export interface ProductImportRow {
  SKU?: string | number;
  ISBN?: string | number;
  Nombre?: string;
  Slug?: string;
  Descripcion?: string;
  Precio?: string | number;
  Moneda?: string;
  PrecioComparacion?: string | number;
  Stock?: string | number;
  Categoria?: string;
  Marca?: string;
  Imagenes?: string;
  Especificaciones?: string;
  Estado?: string;
  Destacado?: string;
}

const EXAMPLE_ROWS: ProductImportRow[] = [
  {
    SKU: "LAP-100",
    ISBN: "",
    Nombre: "Laptop Ejemplo 15",
    Slug: "laptop-ejemplo-15",
    Descripcion: "Descripción breve del producto.",
    Precio: 999,
    Moneda: "USD",
    PrecioComparacion: 1099,
    Stock: 10,
    Categoria: "Laptops",
    Marca: "PowerTech",
    Imagenes: "https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg",
    Especificaciones: "CPU: Intel Core i7; RAM: 16GB; Almacenamiento: 512GB SSD",
    Estado: "activo",
    Destacado: "No",
  },
  {
    SKU: "MOU-100",
    ISBN: "",
    Nombre: "Mouse Ejemplo Inalámbrico",
    Slug: "",
    Descripcion: "Se genera el slug automáticamente si se deja vacío.",
    Precio: 25,
    Moneda: "ARS",
    PrecioComparacion: "",
    Stock: 30,
    Categoria: "Periféricos",
    Marca: "KeyForge",
    Imagenes: "",
    Especificaciones: "",
    Estado: "activo",
    Destacado: "Si",
  },
];

/**
 * Genera y descarga la plantilla .xlsx para carga masiva, con una hoja de
 * instrucciones que incluye las categorías reales disponibles (deben
 * escribirse tal cual para que la importación las reconozca).
 */
export async function downloadProductImportTemplate(categories: Category[]) {
  const workbook = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: [...IMPORT_HEADERS] });
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Productos");

  const instructions = [
    ["Cómo llenar esta plantilla"],
    [""],
    ["SKU", "Obligatorio. Código único del producto. Si ya existe, se actualiza; si no, se crea."],
    ["ISBN", "Opcional. Código de barras/ISBN, único si se completa."],
    ["Nombre", "Obligatorio."],
    ["Slug", "Opcional. Se genera automáticamente a partir del Nombre si se deja vacío."],
    ["Descripcion", "Opcional."],
    ["Precio", "Obligatorio. Número, sin símbolo de moneda (ej: 999)."],
    ["Moneda", `Opcional. Una de: ${CURRENCIES.join(", ")}. Si se deja vacío, se usa USD.`],
    ["PrecioComparacion", "Opcional. Precio anterior/tachado."],
    ["Stock", "Obligatorio. Número entero (ej: 10)."],
    ["Categoria", "Obligatorio. Debe coincidir EXACTAMENTE con el nombre de una categoría existente (ver abajo)."],
    ["Marca", "Opcional."],
    ["Imagenes", "Opcional. URLs separadas por coma. Cada URL debe ser https y terminar en .jpg, .png, .gif, .webp, .avif o .svg — cualquier sitio sirve."],
    ["Especificaciones", "Opcional. Formato: Clave: Valor; Clave2: Valor2 (separadas por punto y coma)."],
    ["Estado", "activo, agotado o descontinuado. Si se deja vacío, se usa 'activo'."],
    ["Destacado", "Si o No. Si se deja vacío, se usa 'No'."],
    [""],
    ["Categorías disponibles ahora mismo:"],
    ...categories.map((c) => [c.name]),
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 20 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instrucciones");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  await saveFile(blob, "Plantilla_Importacion_Productos.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function parseProductImportFile(file: File): Promise<ProductImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() !== "instrucciones") ?? workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<ProductImportRow>(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Exporta productos con el mismo formato de columnas que la plantilla, para poder re-importarlos. */
export async function exportProductsToExcel(products: Product[], fileName: string) {
  const rows = products.map((p) => ({
    SKU: sanitizeSpreadsheetCell(p.sku),
    ISBN: sanitizeSpreadsheetCell(p.isbn ?? ""),
    Nombre: sanitizeSpreadsheetCell(p.name),
    Slug: sanitizeSpreadsheetCell(p.slug),
    Descripcion: sanitizeSpreadsheetCell(p.description),
    Precio: p.price,
    Moneda: p.currency,
    PrecioComparacion: p.compareAtPrice ?? "",
    Stock: p.stock,
    Categoria: sanitizeSpreadsheetCell(typeof p.category === "object" ? p.category.name : ""),
    Marca: sanitizeSpreadsheetCell(p.brand ?? ""),
    Imagenes: sanitizeSpreadsheetCell(p.images.join(", ")),
    Especificaciones: sanitizeSpreadsheetCell(
      Object.entries(p.specs ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ")
    ),
    Estado: p.status,
    Destacado: p.featured ? "Si" : "No",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...IMPORT_HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  await saveFile(blob, `${fileName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
