import { UsersManager } from "@/components/dashboard/UsersManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function SupervisorUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Usuarios</h1>
          <p className="text-foreground-secondary">Administra encargados y operarios.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Podés crear y editar cuentas de encargados y operarios.",
            "Los cambios que hagas sobre un encargado u operario (incluida su contraseña) siempre quedan pendientes de aprobación del admin.",
            "Para suspender una cuenta, editá su Estado desde el lápiz: también queda pendiente de aprobación.",
          ]}
        />
      </div>
      <UsersManager />
    </div>
  );
}
