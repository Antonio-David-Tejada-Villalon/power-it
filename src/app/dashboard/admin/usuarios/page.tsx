import { UsersManager } from "@/components/dashboard/UsersManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Usuarios</h1>
          <p className="text-foreground-secondary">Administra el equipo y sus permisos.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "El formulario superior crea un nuevo usuario del equipo con el rol elegido.",
            "El ícono de lápiz permite cambiar nombre, rol y estado de un usuario existente.",
            "Suspender un usuario le bloquea el acceso sin borrar su historial (pedidos, auditoría).",
          ]}
        />
      </div>
      <UsersManager />
    </div>
  );
}
