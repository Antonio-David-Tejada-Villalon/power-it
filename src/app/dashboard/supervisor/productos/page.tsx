"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductsTable } from "@/components/dashboard/ProductsTable";
import { ProductBulkTools } from "@/components/dashboard/ProductBulkTools";
import { HelpPopover } from "@/components/ui/HelpPopover";

export default function SupervisorProductsPage() {
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="font-heading text-3xl font-bold">Productos</h1>
            <p className="text-foreground-secondary">Gestiona el catálogo de tecnología.</p>
          </div>
          <HelpPopover
            title="Cómo funciona esta sección"
            tips={[
              "\"Nuevo producto\" abre el formulario completo, incluyendo especificaciones.",
              "El ícono de lápiz edita un producto. Solo un administrador puede eliminarlos.",
              "El stock se descuenta automáticamente con los pedidos y se devuelve si se cancelan.",
              "Descarga la plantilla para cargar muchos productos a la vez desde Excel; si el SKU ya existe, se actualiza en vez de duplicarse.",
              "Selecciona productos con el checkbox para exportar solo esos, o exporta el catálogo completo.",
            ]}
          />
        </div>
        <Link
          href="/dashboard/supervisor/productos/nuevo"
          className="px-5 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} />
          Nuevo producto
        </Link>
      </div>

      <ProductBulkTools onImported={() => setReloadToken((t) => t + 1)} />

      <ProductsTable
        canWrite
        canDelete={false}
        selectable
        reloadToken={reloadToken}
        editPathPrefix="/dashboard/supervisor/productos"
      />
    </div>
  );
}
