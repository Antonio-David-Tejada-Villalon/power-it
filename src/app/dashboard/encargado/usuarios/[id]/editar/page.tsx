import { UserEditForm } from "@/components/dashboard/UserEditForm";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Editar usuario</h1>
        <p className="text-foreground-secondary">Actualiza el rol, estado y contraseña del usuario.</p>
      </div>
      <UserEditForm userId={id} />
    </div>
  );
}
