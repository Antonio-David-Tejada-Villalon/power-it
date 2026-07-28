"use client";

import { useEffect, useState, type FormEvent } from "react";

export function SettingsForm() {
  const [siteName, setSiteName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings;
        if (!s) return;
        setSiteName(s.siteName ?? "");
        setContactEmail(s.contactEmail ?? "");
        setHeroTitle(s.heroBanner?.title ?? "");
        setHeroSubtitle(s.heroBanner?.subtitle ?? "");
        setAllowGuestCheckout(s.checkout?.allowGuestCheckout ?? true);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName,
        contactEmail,
        heroBanner: { title: heroTitle, subtitle: heroSubtitle },
        checkout: { allowGuestCheckout },
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar la configuración");
      return;
    }
    setSaved(true);
  };

  const inputClass =
    "w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 bg-card border border-[color:var(--glass-border)] rounded-2xl p-8">
      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">Configuración guardada.</p>}

      <div className="space-y-1">
        <label className="text-sm font-semibold">Nombre del sitio</label>
        <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Email de contacto (pedidos)</label>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Título del banner</label>
        <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold">Subtítulo del banner</label>
        <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} rows={2} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={allowGuestCheckout} onChange={(e) => setAllowGuestCheckout(e.target.checked)} />
        Permitir pedidos sin registrarse (guest checkout)
      </label>

      <button type="submit" className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold transition-colors">
        Guardar configuración
      </button>
    </form>
  );
}
