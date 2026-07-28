import { CategoriesManager } from "@/components/dashboard/CategoriesManager";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Categorías</h1>
          <p className="text-foreground-secondary">Organiza el catálogo por categorías.</p>
        </div>
        <HelpPopover
          title="Cómo funciona esta sección"
          tips={[
            "Escribe un nombre y presiona Agregar para crear una categoría.",
            "El ícono de lápiz permite editar el nombre y estado directamente en la tabla.",
            "Selecciona varias con el checkbox para eliminarlas en lote.",
            "No se puede eliminar una categoría que todavía tenga productos asociados.",
          ]}
        />
      </div>
      <CategoriesManager canDelete />
    </div>
  );
}
