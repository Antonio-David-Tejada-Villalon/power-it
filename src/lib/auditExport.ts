"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveFile } from "@/lib/exportUtils";
import { sanitizeSpreadsheetCell } from "@/lib/utils";

export interface AuditLogRow {
  id: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  createdAt: string;
}

export const exportAuditToExcel = async (logs: AuditLogRow[], fileName: string) => {
  const data = logs.map((log) => ({
    Fecha: new Date(log.createdAt).toLocaleString("es"),
    Acción: sanitizeSpreadsheetCell(log.action),
    Usuario: sanitizeSpreadsheetCell(log.actorEmail),
    Recurso: sanitizeSpreadsheetCell(log.resourceType),
    "ID de recurso": sanitizeSpreadsheetCell(log.resourceId ?? ""),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

  await saveFile(blob, `${fileName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
};

export const exportAuditToPDF = async (logs: AuditLogRow[], fileName: string) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Power IT - Auditoría", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generado el: ${new Date().toLocaleDateString()} · ${logs.length} registro(s)`, 14, 30);

  autoTable(doc, {
    head: [["Fecha", "Acción", "Usuario", "Recurso"]],
    body: logs.map((log) => [
      new Date(log.createdAt).toLocaleString("es"),
      log.action,
      log.actorEmail,
      log.resourceType,
    ]),
    startY: 40,
    theme: "grid",
    headStyles: { fillColor: [60, 200, 242] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 8 },
  });

  const pdfBlob = doc.output("blob");
  await saveFile(pdfBlob, `${fileName}.pdf`, "application/pdf");
};
