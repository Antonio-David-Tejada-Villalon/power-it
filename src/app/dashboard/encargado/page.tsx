import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function EncargadoDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Resumen</h1>
          <p className="text-foreground-secondary">Tus pedidos y tareas del día.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "\"Pedidos de hoy\" cuenta todos los pedidos creados hoy en el sistema.",
            "\"Pedidos asignados activos\" son los que tienes asignados y no están completados.",
          ]}
        />
      </div>
      <KPIGrid />
    </div>
  );
}
