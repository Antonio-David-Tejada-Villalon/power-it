"use client";

import { useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  className?: string;
}

// Igual que un compositor de email en modo texto plano (Gmail, Outlook):
// los botones insertan sintaxis Markdown alrededor de la selección en vez
// de contentEditable/HTML — así lo que se guarda sigue siendo texto simple
// (se puede exportar a Excel, indexar para búsqueda, etc.) y lo que se
// muestra en el catálogo se renderiza con react-markdown, que nunca
// interpreta HTML crudo (sin superficie de XSS aunque el texto venga de
// un admin distinto al que lo lee).
type Wrap = { before: string; after: string } | { linePrefix: string };

const TOOLS: { icon: typeof Bold; label: string; wrap: Wrap }[] = [
  { icon: Bold, label: "Negrita", wrap: { before: "**", after: "**" } },
  { icon: Italic, label: "Cursiva", wrap: { before: "_", after: "_" } },
  { icon: List, label: "Lista con viñetas", wrap: { linePrefix: "- " } },
  { icon: ListOrdered, label: "Lista numerada", wrap: { linePrefix: "1. " } },
];

export function RichTextField({ value, onChange, maxLength, rows = 4, placeholder, className }: RichTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyTool = (wrap: Wrap) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let cursorStart: number;
    let cursorEnd: number;

    if ("linePrefix" in wrap) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      next = value.slice(0, lineStart) + wrap.linePrefix + value.slice(lineStart);
      cursorStart = start + wrap.linePrefix.length;
      cursorEnd = end + wrap.linePrefix.length;
    } else {
      next = value.slice(0, start) + wrap.before + selected + wrap.after + value.slice(end);
      cursorStart = start + wrap.before.length;
      cursorEnd = cursorStart + selected.length;
    }

    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const remaining = maxLength - value.length;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg w-fit">
        {TOOLS.map(({ icon: Icon, label, wrap }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyTool(wrap)}
            title={label}
            aria-label={label}
            className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-foreground-secondary hover:text-foreground transition-colors"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm resize-y"
      />
      <p className={cn("text-xs text-right", remaining < 50 ? "text-warning" : "text-foreground-secondary")}>
        {value.length} / {maxLength}
      </p>
    </div>
  );
}
