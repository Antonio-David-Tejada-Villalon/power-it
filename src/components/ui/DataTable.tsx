import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, getRowId, emptyMessage }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-foreground-secondary bg-card border border-[color:var(--glass-border)] rounded-2xl">
        {emptyMessage ?? "No hay datos para mostrar."}
      </div>
    );
  }

  return (
    <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--glass-border)] bg-black/5 dark:bg-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-5 py-3 font-semibold text-foreground-secondary text-xs uppercase tracking-wide"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowId(row)}
                className="border-b border-[color:var(--glass-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 align-middle ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
