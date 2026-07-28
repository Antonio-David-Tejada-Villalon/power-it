"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-[color:var(--glass-border)] rounded-[1.5rem] shadow-2xl z-[210] overflow-hidden"
          >
            <div className="p-7 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${
                      tone === "danger" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">{title}</h3>
                    <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">{description}</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    tone === "danger" ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary-hover"
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
