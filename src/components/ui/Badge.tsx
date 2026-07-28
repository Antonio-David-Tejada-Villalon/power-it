import { cn } from "@/lib/utils";

const TONE_MAP: Record<string, string> = {
  activo: "bg-success/10 text-success",
  activa: "bg-success/10 text-success",
  active: "bg-success/10 text-success",
  completado: "bg-success/10 text-success",
  pagado: "bg-success/10 text-success",
  agotado: "bg-danger/10 text-danger",
  descontinuado: "bg-danger/10 text-danger",
  cancelado: "bg-danger/10 text-danger",
  fallido: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
  inactiva: "bg-foreground-secondary/10 text-foreground-secondary",
  pendiente: "bg-warning/10 text-warning",
  confirmado: "bg-accent/10 text-accent",
  en_proceso: "bg-warning/10 text-warning",
  enviado: "bg-accent/10 text-accent",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const className = tone ? TONE_MAP[tone] ?? "bg-primary/10 text-primary" : "bg-primary/10 text-primary";
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap", className)}>
      {children}
    </span>
  );
}
