import { ProductsTable } from "@/components/dashboard/ProductsTable";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function EncargadoInventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Inventario</h1>
          <p className="text-foreground-secondary">Actualiza el stock disponible de cada producto.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Escribe la nueva cantidad en el campo de stock y presiona el botón de guardar de esa fila.",
            "No puedes editar precio, descripción ni eliminar productos desde aquí, solo el stock.",
          ]}
        />
      </div>
      <ProductsTable canWrite={false} canDelete={false} stockOnly />
    </div>
  );
}
