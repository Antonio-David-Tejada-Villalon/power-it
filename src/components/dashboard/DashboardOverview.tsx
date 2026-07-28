"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { DateRangePicker, type DateRange } from "@/components/ui/DateRangePicker";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { TopProductsRanking } from "@/components/dashboard/TopProductsRanking";
import { exportSummaryToExcel, exportSummaryToPDF, type SummaryKpi, type SummaryTopProduct } from "@/lib/summaryExport";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(from), to: toISODate(now) };
}

export function DashboardOverview() {
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [kpis, setKpis] = useState<SummaryKpi[]>([]);
  const [topProducts, setTopProducts] = useState<SummaryTopProduct[]>([]);

  // Se guarda una copia de los mismos datos que muestran KPIGrid/TopProductsRanking
  // para poder exportarlos tal cual se ven en pantalla.
  useEffect(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to });
    fetch(`/api/dashboard/kpis?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setKpis(data.kpis ?? []));
    fetch(`/api/dashboard/top-products?${params.toString()}&limit=10`)
      .then((res) => res.json())
      .then((data) => setTopProducts(data.items ?? []));
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <DateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => exportSummaryToExcel(kpis, topProducts, range, "Resumen_PowerIT")}
            disabled={kpis.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-success/10 text-success rounded-lg text-xs font-semibold hover:bg-success/20 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button
            onClick={() => exportSummaryToPDF(kpis, topProducts, range, "Resumen_PowerIT")}
            disabled={kpis.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-danger/10 text-danger rounded-lg text-xs font-semibold hover:bg-danger/20 transition-colors disabled:opacity-40"
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>
      <KPIGrid from={range.from} to={range.to} />
      <TopProductsRanking from={range.from} to={range.to} />
    </div>
  );
}
