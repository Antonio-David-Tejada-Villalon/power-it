import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminOrdersPage() {
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
            "Usa las pestañas para ver los pedidos de cada estado (Pendiente, Confirmado, En proceso, Enviado, Completado, Cancelado).",
            "Al cambiar el estado se pide confirmación, porque puede afectar el stock: cancelar devuelve las unidades reservadas, reactivar las vuelve a descontar.",
            "Puedes mover un pedido a cualquier estado, no solo hacia adelante.",
            "Selecciona varios pedidos con el checkbox para eliminarlos en lote; los activos liberan su stock reservado al eliminarse.",
            "Todo cambio queda registrado en Auditoría.",
          ]}
        />
      </div>
      <OrdersTable canUpdateStatus canDelete />
    </div>
  );
}
