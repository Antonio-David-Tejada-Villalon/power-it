"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo iniciar sesión");
      return;
    }

    const next = searchParams.get("next") ?? "/dashboard";
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo priority className="h-14 w-auto object-contain" />
          <h1 className="font-heading text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-foreground-secondary">Accede al panel de Power IT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-[color:var(--glass-border)] rounded-2xl p-8">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="space-y-1">
            <label className="text-sm font-semibold">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold">Contraseña</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-foreground-secondary">
          ¿Eres cliente y no tienes cuenta?{" "}
          <Link href="/registro" className="text-primary font-semibold">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
