"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CartItem } from "@/hooks/useCart";
import { formatPrice, type Currency } from "@/lib/currency";
import { sanitizeSpreadsheetCell } from "@/lib/utils";

declare global {
  interface Window {
    showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
  }
}

// El carrito nunca mezcla monedas (useCart lo garantiza al agregar), así que
// alcanza con la moneda del primer item.
function cartCurrency(items: CartItem[]): Currency {
  return items[0]?.currency ?? "USD";
}

export const exportToExcel = async (items: CartItem[], fileName: string) => {
  const data = items.map((item) => ({
    Cant: item.cantidad,
    SKU: sanitizeSpreadsheetCell(item.sku),
    Producto: sanitizeSpreadsheetCell(item.name),
    Marca: sanitizeSpreadsheetCell(item.brand ?? ""),
    Precio: item.price,
    Subtotal: item.price * item.cantidad,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pedido");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

  await saveFile(blob, `${fileName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
};

export const exportToPDF = async (items: CartItem[], fileName: string, contactEmail: string) => {
  const doc = new jsPDF();
  const currencyCode = cartCurrency(items);

  const tableColumn = ["Cant", "SKU", "Producto", "Marca", "Precio", "Subtotal"];
  const tableRows = items.map((item) => [
    item.cantidad,
    item.sku,
    item.name,
    item.brand ?? "",
    formatPrice(item.price, currencyCode),
    formatPrice(item.price * item.cantidad, currencyCode),
  ]);

  doc.setFontSize(18);
  doc.text("Power IT - Pedido", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: "grid",
    headStyles: { fillColor: [60, 200, 242] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const total = items.reduce((acc, item) => acc + item.price * item.cantidad, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total: ${formatPrice(total, currencyCode)}`, 14, finalY);
  doc.setFontSize(10);
  doc.text(`Solicitud de presupuesto para ${contactEmail}`, 14, finalY + 8);

  const pdfBlob = doc.output("blob");
  await saveFile(pdfBlob, `${fileName}.pdf`, "application/pdf");
};

export const saveFile = async (blob: Blob, fileName: string, mimeType: string) => {
  if (typeof window !== "undefined" && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Documento",
            accept: { [mimeType]: [`.${fileName.split(".").pop()}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      console.error("File Picker was cancelled or failed", err);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
