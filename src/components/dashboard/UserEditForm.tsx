"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { Role } from "@/models/User";
import { manageableRoles, ROLE_LABELS } from "@/lib/auth/hierarchy";
import { useSession } from "@/components/dashboard/SessionContext";

export function UserEditForm({ userId }: { userId: string }) {
  const router = useRouter();
  const actor = useSession();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("cliente");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [canApproveOwnEdits, setCanApproveOwnEdits] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name);
          setRole(data.user.role);
          setStatus(data.user.status);
          setCanApproveOwnEdits(data.user.canApproveOwnEdits ?? false);
        }
      });
  }, [userId]);

  const isAdmin = actor.role === "admin";
  const isSelf = actor.id === userId;
  // manageableRoles("admin") ya incluye los 5 roles — una sola fuente de
  // verdad, sin repetir el listado a mano en paralelo a hierarchy.ts. El Set
  // con `role` cubre el caso de un rol ya asignado que el actor no podría
  // asignar de cero (para que no desaparezca del <select>).
  const availableRoles = Array.from(new Set([...manageableRoles(actor.role), role]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !reason.trim()) {
      setError("Indicá un motivo para la solicitud");
      return;
    }
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = { name };
    if (!isSelf || isAdmin) {
      body.role = role;
      body.status = status;
    }
    if (password) body.password = password;
    if (isAdmin && role === "supervisor") body.canApproveOwnEdits = canApproveOwnEdits;
    if (!isAdmin) body.reason = reason;

    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar el usuario");
      return;
    }

    if (res.status === 202) {
      setSubmitted(true);
      return;
    }

    router.push(`/dashboard/${actor.role}/usuarios`);
    router.refresh();
  };

  const inputClass =
    "w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  if (submitted) {
    return (
      <div className="max-w-xl bg-card border border-[color:var(--glass-border)] rounded-2xl p-8 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">Solicitud enviada</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            El cambio quedó pendiente de aprobación. Podés seguir su estado en Solicitudes.
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/${actor.role}/usuarios`)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5 bg-card border border-[color:var(--glass-border)] rounded-2xl p-8">
      {error && <p className="text-sm text-danger">{error}</p>}
      {!isAdmin && (
        <div className="px-4 py-3 rounded-xl bg-warning/10 text-warning text-xs leading-relaxed">
          Este cambio no se aplica de inmediato: queda como solicitud pendiente de aprobación por tu responsable.
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm font-semibold">Nombre</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      {(!isSelf || isAdmin) && (
        <div className="space-y-1">
          <label className="text-sm font-semibold">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      )}
      {(!isSelf || isAdmin) && (
        <div className="space-y-1">
          <label className="text-sm font-semibold">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "suspended")} className={inputClass}>
            <option value="active">Activo</option>
            <option value="suspended">Suspendido</option>
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm font-semibold">Contraseña nueva</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dejar en blanco para no cambiarla"
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-foreground-secondary">Mínimo 8 caracteres, combinando letras y números.</p>
      </div>
      {isAdmin && role === "supervisor" && (
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={canApproveOwnEdits}
            onChange={(e) => setCanApproveOwnEdits(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Permitir que este supervisor apruebe sus propias solicitudes de edición sin escalarlas al admin.
          </span>
        </label>
      )}
      {!isAdmin && (
        <div className="space-y-1">
          <label className="text-sm font-semibold">Motivo de la solicitud</label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explicá por qué se necesita este cambio..."
            className={`${inputClass} resize-none`}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold transition-colors"
      >
        {saving ? "Guardando..." : isAdmin ? "Guardar cambios" : "Enviar solicitud"}
      </button>
    </form>
  );
}
