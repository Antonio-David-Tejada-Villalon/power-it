import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Resumen general</h1>
          <p className="text-foreground-secondary">Vista completa del negocio Power IT.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Elige un rango de fechas (o usa los atajos Hoy / Últimos 7 días / Este mes / Este año) para recalcular todo.",
            "\"Egresos (cancelados)\" es el valor de los pedidos cancelados en el período seleccionado.",
            "El ranking de productos más vendidos cuenta unidades vendidas en pedidos no cancelados dentro del rango.",
            "Los botones Excel y PDF exportan el resumen y el ranking del período elegido, con una breve explicación de cada indicador.",
          ]}
        />
      </div>
      <DashboardOverview />
    </div>
  );
}
