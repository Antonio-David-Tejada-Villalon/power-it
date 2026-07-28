import { RequestsManager } from "@/components/dashboard/RequestsManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function EncargadoRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Solicitudes</h1>
          <p className="text-foreground-secondary">Cambios de cuenta de tus operarios pendientes de aprobación.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Acá aparecen las solicitudes que generan tus operarios al editar su propio perfil.",
            "Aprobar aplica el cambio de inmediato; rechazar o eliminar no aplica ningún cambio.",
            "Los cambios que vos hagas sobre un operario, o sobre tu propia cuenta, los aprueba tu supervisor.",
          ]}
        />
      </div>
      <RequestsManager />
    </div>
  );
}
