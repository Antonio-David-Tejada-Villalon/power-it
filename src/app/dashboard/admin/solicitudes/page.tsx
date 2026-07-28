import { RequestsManager } from "@/components/dashboard/RequestsManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Solicitudes</h1>
          <p className="text-foreground-secondary">Cambios de cuenta pendientes de aprobación en todo el equipo.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Como admin ves y podés resolver todas las solicitudes de cualquier nivel.",
            "Aprobar aplica los cambios propuestos de inmediato; rechazar o eliminar no aplica ningún cambio.",
            "Toda acción (aprobar, rechazar, eliminar) requiere un motivo, visible luego en el historial.",
            "Los cambios de un supervisor sobre sí mismo se elevan a vos, salvo que le hayas otorgado el privilegio de autoaprobarse.",
          ]}
        />
      </div>
      <RequestsManager />
    </div>
  );
}
