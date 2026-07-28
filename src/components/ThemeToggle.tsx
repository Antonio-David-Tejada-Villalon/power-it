"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Guard de hidratación: el tema real solo se conoce en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-3 w-12 h-12" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-3 glass rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all group overflow-hidden"
      aria-label="Cambiar tema"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "moon" : "sun"}
          initial={{ y: 20, opacity: 0, rotate: 40 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -20, opacity: 0, rotate: -40 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon size={24} className="text-primary" />
          ) : (
            <Sun size={24} className="text-primary" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
