import { OrderDetail } from "@/components/dashboard/OrderDetail";

export default async function EncargadoOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Detalle de pedido</h1>
        <p className="text-foreground-secondary">Actualiza el estado del pedido.</p>
      </div>
      <OrderDetail orderId={id} listPath="/dashboard/encargado/pedidos" />
    </div>
  );
}
