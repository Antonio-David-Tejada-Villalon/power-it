import { AuditLogTable } from "@/components/dashboard/AuditLogTable";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Auditoría</h1>
          <p className="text-foreground-secondary">Historial de acciones sensibles del sistema.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Filtra por acción, usuario, tipo de recurso o rango de fechas; los filtros se combinan.",
            "Los botones Excel y PDF exportan exactamente los resultados filtrados en pantalla.",
            "Cada acción sensible del sistema (crear/editar/eliminar, cambios de estado, login) queda registrada acá de forma automática.",
          ]}
        />
      </div>
      <AuditLogTable />
    </div>
  );
}
