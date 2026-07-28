"use client";

import { cn } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function preset(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toISODate(from), to: toISODate(to) };
}

function presetThisMonth(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(from), to: toISODate(now) };
}

function presetThisYear(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toISODate(from), to: toISODate(now) };
}

const PRESETS: { label: string; getRange: () => DateRange }[] = [
  { label: "Hoy", getRange: () => preset(0) },
  { label: "Últimos 7 días", getRange: () => preset(7) },
  { label: "Este mes", getRange: () => presetThisMonth() },
  { label: "Este año", getRange: () => presetThisYear() },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const inputClass =
    "px-3 py-2 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-foreground-secondary">Desde</label>
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-foreground-secondary">Hasta</label>
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const range = p.getRange();
          const active = range.from === value.from && range.to === value.to;
          return (
            <button
              key={p.label}
              onClick={() => onChange(range)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                active ? "bg-primary text-white" : "bg-black/5 dark:bg-white/5 hover:bg-primary/10"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
