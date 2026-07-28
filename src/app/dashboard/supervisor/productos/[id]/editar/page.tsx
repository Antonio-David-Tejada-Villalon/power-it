import { ProductForm } from "@/components/dashboard/ProductForm";

export default async function EditProductPageSupervisor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Editar producto</h1>
        <p className="text-foreground-secondary">Actualiza la información del producto.</p>
      </div>
      <ProductForm productId={id} />
    </div>
  );
}
