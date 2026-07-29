"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveFile } from "@/lib/exportUtils";
import { formatPrice } from "@/lib/currency";

export interface SummaryKpi {
  label: string;
  value: number;
  format?: string;
}

export interface SummaryTopProduct {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

const KPI_EXPLANATIONS: Record<string, string> = {
  "Ventas del período (USD)":
    "Suma del total de los pedidos no cancelados creados dentro del rango de fechas seleccionado. Los pedidos en otras monedas se convierten a USD con el tipo de cambio vigente al generar el reporte.",
  "Pedidos del período": "Cantidad de pedidos no cancelados creados dentro del rango de fechas seleccionado.",
  "Egresos (cancelados, USD)":
    "Valor total de los pedidos cancelados dentro del rango de fechas seleccionado (dinero reservado que no se concretó), convertido a USD.",
  "Pedidos cancelados": "Cantidad de pedidos cancelados dentro del rango de fechas seleccionado.",
  "Productos sin stock": "Cantidad de productos con stock en 0 al momento de generar este reporte (no depende del rango de fechas).",
  "Usuarios activos": "Cantidad de usuarios del equipo con estado activo al momento de generar este reporte.",
  "Pedidos de hoy": "Cantidad de pedidos creados en el día de hoy.",
  "Pedidos asignados activos": "Pedidos asignados al usuario que todavía no están completados.",
};

function formatKpiValue(kpi: SummaryKpi): string {
  return kpi.format === "currency" ? formatPrice(kpi.value, "USD") : String(kpi.value);
}

export async function exportSummaryToExcel(
  kpis: SummaryKpi[],
  topProducts: SummaryTopProduct[],
  range: { from: string; to: string },
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["Power IT - Resumen General"],
    [`Período: ${range.from} a ${range.to}`],
    [`Generado el: ${new Date().toLocaleString("es")}`],
    [],
    ["Indicador", "Valor", "Explicación"],
    ...kpis.map((kpi) => [kpi.label, formatKpiValue(kpi), KPI_EXPLANATIONS[kpi.label] ?? ""]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 26 }, { wch: 16 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  if (topProducts.length > 0) {
    const rankingRows = topProducts.map((p, i) => ({
      "#": i + 1,
      Producto: p.name,
      SKU: p.sku,
      "Unidades vendidas": p.unitsSold,
      Ingresos: p.revenue,
    }));
    const rankingSheet = XLSX.utils.json_to_sheet(rankingRows);
    XLSX.utils.book_append_sheet(workbook, rankingSheet, "Ranking de Ventas");
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  await saveFile(blob, `${fileName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export async function exportSummaryToPDF(
  kpis: SummaryKpi[],
  topProducts: SummaryTopProduct[],
  range: { from: string; to: string },
  fileName: string
) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Power IT - Resumen General", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${range.from} a ${range.to}  ·  Generado el: ${new Date().toLocaleString("es")}`, 14, 28);

  autoTable(doc, {
    head: [["Indicador", "Valor", "Explicación"]],
    body: kpis.map((kpi) => [kpi.label, formatKpiValue(kpi), KPI_EXPLANATIONS[kpi.label] ?? ""]),
    startY: 36,
    theme: "grid",
    headStyles: { fillColor: [60, 200, 242] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 8, cellWidth: "wrap" },
    columnStyles: { 2: { cellWidth: 100 } },
  });

  if (topProducts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterKpisY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text("Ranking de productos más vendidos", 14, afterKpisY);

    autoTable(doc, {
      head: [["#", "Producto", "SKU", "Unidades", "Ingresos"]],
      body: topProducts.map((p, i) => [
        String(i + 1),
        p.name,
        p.sku,
        String(p.unitsSold),
        formatPrice(p.revenue, "USD"),
      ]),
      startY: afterKpisY + 6,
      theme: "grid",
      headStyles: { fillColor: [60, 200, 242] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 8 },
    });
  }

  const pdfBlob = doc.output("blob");
  await saveFile(pdfBlob, `${fileName}.pdf`, "application/pdf");
}
