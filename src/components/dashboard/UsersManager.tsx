"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, UserX, Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { ClientUser } from "@/lib/types";
import type { Role } from "@/models/User";
import { manageableRoles, ROLE_LABELS } from "@/lib/auth/hierarchy";

export function UsersManager() {
  const [actor, setActor] = useState<ClientUser | null>(null);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "" as Role | "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.items ?? []));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setActor(data.user ?? null));
    load();
  }, []);

  if (!actor) return null;

  const isAdmin = actor.role === "admin";
  const creatableRoles = isAdmin
    ? (["admin", "supervisor", "encargado", "operario", "cliente"] as Role[])
    : manageableRoles(actor.role);
  const defaultRole = form.role || creatableRoles[0] || "";

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: defaultRole }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear el usuario");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "" });
    load();
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("¿Suspender este usuario?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    load();
  };

  const inputClass =
    "px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  const columns: Column<ClientUser>[] = [
    {
      key: "name",
      header: "Usuario",
      render: (u) => (
        <div>
          <p className="font-semibold">{u.name}</p>
          <p className="text-xs text-foreground-secondary">{u.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Rol", render: (u) => <Badge>{ROLE_LABELS[u.role]}</Badge> },
    { key: "status", header: "Estado", render: (u) => <Badge tone={u.status}>{u.status}</Badge> },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex items-center gap-2 justify-end">
          <Link href={`/dashboard/${actor.role}/usuarios/${u.id}/editar`} className="p-2 rounded-lg hover:bg-primary/10 text-primary">
            <Pencil size={16} />
          </Link>
          {isAdmin && u.status === "active" && (
            <button onClick={() => handleSuspend(u.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger">
              <UserX size={16} />
            </button>
          )}
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1 md:col-span-1">
          <label className="text-xs font-semibold">Nombre</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} w-full`} />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-xs font-semibold">Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} w-full`} />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-xs font-semibold">Contraseña</label>
          <input
            required
            minLength={8}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={`${inputClass} w-full`}
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-xs font-semibold">Rol</label>
          <select value={defaultRole} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={`${inputClass} w-full`}>
            {creatableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={saving}
          className="px-5 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          Crear
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      <DataTable columns={columns} data={users} getRowId={(u) => u.id} emptyMessage="Sin usuarios todavía." />
    </div>
  );
}
