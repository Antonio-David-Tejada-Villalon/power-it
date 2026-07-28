import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function SupervisorDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Resumen</h1>
          <p className="text-foreground-secondary">Ventas, stock y pedidos.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Elige un rango de fechas (o un atajo rápido) para recalcular las métricas.",
            "\"Egresos (cancelados)\" es el valor de los pedidos cancelados en el período.",
            "El ranking muestra los productos más vendidos dentro del rango elegido.",
            "Los botones Excel y PDF exportan el resumen y el ranking del período con una breve explicación de cada indicador.",
          ]}
        />
      </div>
      <DashboardOverview />
    </div>
  );
}
