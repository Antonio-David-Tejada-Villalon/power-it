"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { ClientUser } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/auth/hierarchy";

export function ProfileForm() {
  const [me, setMe] = useState<ClientUser | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setMe(data.user);
          setName(data.user.name);
        }
      });
  }, []);

  if (!me) return null;

  const isAdmin = me.role === "admin";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !reason.trim()) {
      setError("Indicá un motivo para la solicitud");
      return;
    }
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = { name };
    if (password) body.password = password;
    if (!isAdmin) body.reason = reason;

    const res = await fetch(`/api/users/${me.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar tu perfil");
      return;
    }

    if (res.status === 202) {
      setSubmitted(true);
      setReason("");
      setPassword("");
      return;
    }

    const data = await res.json();
    setMe(data.user);
    setPassword("");
  };

  const inputClass =
    "w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-8 space-y-1">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">{ROLE_LABELS[me.role]}</p>
        <h2 className="font-heading text-xl font-bold">{me.email}</h2>
      </div>

      {submitted && (
        <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-8 space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold">Solicitud enviada</h3>
            <p className="text-sm text-foreground-secondary mt-1">
              Tu cambio quedó pendiente de aprobación. Podés seguir su estado en Solicitudes.
            </p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            Entendido
          </button>
        </div>
      )}

      {!submitted && (
        <form onSubmit={handleSubmit} className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-8 space-y-5">
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
          </div>
          {!isAdmin && (
            <div className="space-y-1">
              <label className="text-sm font-semibold">Motivo de la solicitud</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explicá por qué necesitás este cambio..."
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
      )}
    </div>
  );
}
