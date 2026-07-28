"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet, FileText } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (fileName: string, type: "excel" | "pdf") => void;
}

export const ExportModal = ({ isOpen, onClose, onExport }: ExportModalProps) => {
  const [fileName, setFileName] = useState("Pedido_PowerIT");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass rounded-[2rem] p-10 z-[110] shadow-2xl space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="font-heading text-2xl font-bold">Exportar Pedido</h2>
              <p className="text-foreground-secondary">Ingresa un nombre para tu archivo y elige el formato.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Nombre del Archivo</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-[color:var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ej: Mi_Pedido"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onExport(fileName, "excel")}
                  className="p-6 glass rounded-2xl flex flex-col items-center gap-3 hover:bg-success/10 hover:border-success/30 transition-all border border-transparent group"
                >
                  <div className="p-3 bg-success/20 text-success rounded-xl group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={24} />
                  </div>
                  <span className="font-semibold text-sm">Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => onExport(fileName, "pdf")}
                  className="p-6 glass rounded-2xl flex flex-col items-center gap-3 hover:bg-danger/10 hover:border-danger/30 transition-all border border-transparent group"
                >
                  <div className="p-3 bg-danger/20 text-danger rounded-xl group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <span className="font-semibold text-sm">PDF (.pdf)</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 text-foreground-secondary hover:text-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
