import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function SupervisorOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Pedidos</h1>
          <p className="text-foreground-secondary">Gestiona el estado de los pedidos.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Usa las pestañas para ver los pedidos de cada estado.",
            "Al cambiar el estado se pide confirmación: cancelar devuelve el stock reservado, reactivar lo vuelve a descontar.",
            "Selecciona varios pedidos para eliminarlos en lote; los activos liberan su stock al eliminarse.",
          ]}
        />
      </div>
      <OrdersTable canUpdateStatus canDelete detailPathPrefix="/dashboard/supervisor/pedidos" />
    </div>
  );
}
