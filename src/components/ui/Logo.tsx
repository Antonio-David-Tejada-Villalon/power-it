"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

export function Logo({ className, priority }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Guard de hidratación: el tema real solo se conoce en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Antes de montar asumimos dark (tema por defecto de la app) para
  // no parpadear entre logos al hidratar.
  const isLight = mounted && resolvedTheme === "light";

  return (
    <Link href="/" aria-label="Ir al inicio" className="inline-flex items-center">
      {isLight ? (
        <Image
          src="/POWER_IT_logo-black.png"
          alt="Power IT"
          width={2190}
          height={1171}
          priority={priority}
          className={className}
        />
      ) : (
        <Image
          src="/POWER_IT_logo-white.png"
          alt="Power IT"
          width={2752}
          height={1364}
          priority={priority}
          className={className}
        />
      )}
    </Link>
  );
}
