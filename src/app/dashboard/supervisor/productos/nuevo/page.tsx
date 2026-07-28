import { ProductForm } from "@/components/dashboard/ProductForm";

export default function NewProductPageSupervisor() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Nuevo producto</h1>
        <p className="text-foreground-secondary">Agrega un producto al catálogo.</p>
      </div>
      <ProductForm />
    </div>
  );
}
