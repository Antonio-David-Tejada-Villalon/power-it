import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Configuración</h1>
          <p className="text-foreground-secondary">Ajustes generales del sitio y checkout.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "El email de contacto es a donde se dirigen las solicitudes de presupuesto del catálogo público.",
            "El título y subtítulo del banner se muestran en la portada del catálogo.",
            "Desactivar \"pedidos sin registrarse\" obliga a los clientes a crear cuenta antes de comprar.",
          ]}
        />
      </div>
      <SettingsForm />
    </div>
  );
}
