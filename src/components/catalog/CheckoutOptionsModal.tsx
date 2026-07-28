"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Download, Send, Loader2, CheckCircle2 } from "lucide-react";
import type { CartItem } from "@/hooks/useCart";

interface CheckoutOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  contactEmail: string;
  onExport: (type: "excel" | "pdf") => void;
  onOrderPlaced: () => void;
}

export const CheckoutOptionsModal = ({
  isOpen,
  onClose,
  items,
  contactEmail,
  onExport,
  onOrderPlaced,
}: CheckoutOptionsModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);

  const handleConfirmOrder = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.id, quantity: item.cantidad })),
          customer: { name, email, phone: phone || undefined },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo confirmar el pedido");
      }
      setSuccess(true);
      onOrderPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailDirect = () => {
    const subject = "Solicitud de Presupuesto - Power IT";
    let body = "Hola, me gustaría solicitar un presupuesto para los siguientes productos:\n\n";
    items.forEach((item) => {
      body += `- ${item.cantidad}x ${item.name} (${item.sku})\n`;
    });
    body += "\nEspero su respuesta. Gracias.";
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background/95 backdrop-blur-2xl border border-[color:var(--glass-border)] rounded-[2rem] shadow-2xl z-[110] overflow-hidden"
          >
            <div className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-2xl text-white">
                    <Send size={24} />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold">Confirmar Pedido</h2>
                    <p className="text-sm text-foreground-secondary">Completa tus datos de contacto</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {success ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 size={48} className="text-success" />
                  <p className="text-lg font-bold">¡Pedido enviado con éxito!</p>
                  <p className="text-sm text-foreground-secondary">
                    Nos pondremos en contacto contigo pronto a {email}.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-6 py-3 bg-primary text-white rounded-2xl font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Teléfono (opcional)"
                      className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
                    />
                    {error && <p className="text-sm text-danger">{error}</p>}
                    <button
                      onClick={handleConfirmOrder}
                      disabled={!canSubmit || submitting}
                      className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      Confirmar Pedido
                    </button>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-[color:var(--glass-border)]" />
                    <span className="relative z-10 mx-auto px-4 bg-background text-[10px] uppercase tracking-widest text-foreground-secondary font-bold flex justify-center w-fit">
                      O exportar
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={handleEmailDirect}
                      className="p-4 glass hover:bg-primary/10 hover:border-primary/30 transition-all rounded-2xl flex flex-col items-center gap-2 text-center"
                    >
                      <Mail size={18} className="text-primary" />
                      <span className="text-xs font-semibold">Email</span>
                    </button>
                    <button
                      onClick={() => onExport("pdf")}
                      className="p-4 glass hover:bg-white/5 transition-all rounded-2xl flex flex-col items-center gap-2 text-center"
                    >
                      <Download size={18} className="text-foreground-secondary" />
                      <span className="text-xs font-semibold">PDF</span>
                    </button>
                    <button
                      onClick={() => onExport("excel")}
                      className="p-4 glass hover:bg-white/5 transition-all rounded-2xl flex flex-col items-center gap-2 text-center"
                    >
                      <Download size={18} className="text-foreground-secondary" />
                      <span className="text-xs font-semibold">Excel</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
