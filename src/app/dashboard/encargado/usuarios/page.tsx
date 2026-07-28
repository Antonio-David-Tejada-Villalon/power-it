import { UsersManager } from "@/components/dashboard/UsersManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function EncargadoUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Usuarios</h1>
          <p className="text-foreground-secondary">Administra a los operarios de tu equipo.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Podés crear y editar cuentas de operarios.",
            "Los cambios que hagas sobre un operario (incluida su contraseña) quedan pendientes de aprobación de tu supervisor.",
            "Cuando un operario edita su propio perfil, la solicitud te llega a vos para aprobarla.",
          ]}
        />
      </div>
      <UsersManager />
    </div>
  );
}
