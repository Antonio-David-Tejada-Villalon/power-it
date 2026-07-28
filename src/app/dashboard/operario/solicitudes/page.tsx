import { RequestsManager } from "@/components/dashboard/RequestsManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function OperarioRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Mis solicitudes</h1>
          <p className="text-foreground-secondary">Seguimiento de tus cambios de perfil solicitados.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Cada cambio que pedís en Mi perfil aparece acá con su estado: pendiente, aprobada, rechazada o eliminada.",
            "Tu encargado revisa y decide sobre tus solicitudes; podés ver el motivo de su decisión una vez resuelta.",
          ]}
        />
      </div>
      <RequestsManager />
    </div>
  );
}
