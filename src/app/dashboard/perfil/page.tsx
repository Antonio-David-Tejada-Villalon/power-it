import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Mi perfil</h1>
          <p className="text-foreground-secondary">Actualiza tu nombre y contraseña.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Podés cambiar tu nombre y tu contraseña en cualquier momento.",
            "Si no sos administrador, el cambio queda como solicitud pendiente de aprobación por tu responsable directo.",
            "Podés seguir el estado de tus solicitudes en la sección Solicitudes.",
          ]}
        />
      </div>
      <ProfileForm />
    </div>
  );
}
