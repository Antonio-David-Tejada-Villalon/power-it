import { RequestsManager } from "@/components/dashboard/RequestsManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function SupervisorRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Solicitudes</h1>
          <p className="text-foreground-secondary">Cambios de cuenta de tu equipo pendientes de aprobación.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Ves las solicitudes de encargados y operarios, además de las tuyas propias.",
            "Las de operarios normalmente las aprueba su encargado primero; si tardan, también podés resolverlas vos.",
            "Aprobar aplica los cambios de inmediato; rechazar o eliminar no aplica ningún cambio.",
            "Tus propias solicitudes las revisa el admin, salvo que te haya otorgado el privilegio de autoaprobación.",
          ]}
        />
      </div>
      <RequestsManager />
    </div>
  );
}
