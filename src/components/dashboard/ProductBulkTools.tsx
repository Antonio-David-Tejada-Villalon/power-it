"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { downloadProductImportTemplate, parseProductImportFile } from "@/lib/productImportExport";

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; sku?: string; message: string }[];
}

interface ProductBulkToolsProps {
  onImported: () => void;
}

export function ProductBulkTools({ onImported }: ProductBulkToolsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      await downloadProductImportTemplate(data.items ?? []);
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const rows = await parseProductImportFile(file);
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo importar el archivo");
        return;
      }
      const data: ImportResult = await res.json();
      setResult(data);
      onImported();
    } catch {
      setError("No se pudo leer el archivo. Verifica que sea un .xlsx válido generado desde la plantilla.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleTemplateDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Descargar plantilla
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {importing ? "Importando..." : "Importar Excel"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelected} className="hidden" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="bg-card border border-[color:var(--glass-border)] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success font-semibold text-sm">
              <CheckCircle2 size={16} />
              {result.created} creado(s), {result.updated} actualizado(s)
            </div>
            <button
              onClick={() => setResult(null)}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-foreground-secondary"
            >
              <X size={14} />
            </button>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-warning font-semibold text-sm">
                <AlertTriangle size={16} />
                {result.errors.length} fila(s) con errores:
              </p>
              <ul className="text-xs text-foreground-secondary space-y-0.5 max-h-40 overflow-y-auto pl-1">
                {result.errors.map((err, i) => (
                  <li key={i}>
                    Fila {err.row}
                    {err.sku ? ` (${err.sku})` : ""}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
