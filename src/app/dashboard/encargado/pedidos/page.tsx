import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function EncargadoOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Pedidos</h1>
          <p className="text-foreground-secondary">Actualiza el estado de los pedidos asignados.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Usa las pestañas para ver los pedidos por estado.",
            "Al cambiar el estado se pide confirmación antes de aplicarlo.",
            "No puedes eliminar pedidos ni editar productos completos, solo actualizar el estado.",
          ]}
        />
      </div>
      <OrdersTable canUpdateStatus detailPathPrefix="/dashboard/encargado/pedidos" />
    </div>
  );
}
