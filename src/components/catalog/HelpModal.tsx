"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, ShoppingBag, FileText, Send, HelpCircle, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  const steps = [
    {
      icon: <Cpu className="text-primary" />,
      title: "Explora el Catálogo",
      desc: "Navega por categorías o usa el buscador para encontrar la tecnología que necesitas: laptops, componentes, periféricos y más.",
    },
    {
      icon: <ShoppingBag className="text-primary" />,
      title: "Agrega a tu Pedido",
      desc: "Haz clic en 'Agregar' para sumar productos a tu carrito. Gestiona cantidades desde el ícono de la bolsa de compras.",
    },
    {
      icon: <Send className="text-primary" />,
      title: "Confirma tu Pedido",
      desc: "Completa tus datos de contacto para enviar el pedido directamente, o exporta tu lista a PDF o Excel.",
    },
    {
      icon: <FileText className="text-primary" />,
      title: "Seguimiento",
      desc: "Nuestro equipo revisará tu pedido y se pondrá en contacto contigo para confirmar disponibilidad y coordinar la entrega.",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-background/95 backdrop-blur-2xl border border-[color:var(--glass-border)] rounded-[2rem] shadow-2xl z-[110] overflow-hidden"
          >
            <div className="p-8 md:p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-2xl text-white">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl font-bold">¿Cómo hacer un pedido?</h2>
                    <p className="text-sm text-foreground-secondary">Guía rápida paso a paso</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">{step.title}</h4>
                      <p className="text-sm text-foreground-secondary leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-foreground text-background rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 size={18} />
                  ¡Entendido!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
