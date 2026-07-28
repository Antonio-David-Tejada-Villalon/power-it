"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/models/User";

const ROLES: Role[] = ["admin", "supervisor", "encargado", "cliente"];

export function UserEditForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("cliente");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name);
          setRole(data.user.role);
          setStatus(data.user.status);
        }
      });
  }, [userId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, status }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar el usuario");
      return;
    }
    router.push("/dashboard/admin/usuarios");
    router.refresh();
  };

  const inputClass =
    "w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5 bg-card border border-[color:var(--glass-border)] rounded-2xl p-8">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-1">
        <label className="text-sm font-semibold">Nombre</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Rol</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "suspended")} className={inputClass}>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold transition-colors"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
