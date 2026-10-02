import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Retorna `true` quando o usuário pediu menos animações no sistema
 * (Windows: "Mostrar animações"; macOS: "Reduzir movimento", etc.).
 * Usado para desligar/atenuar as animações do framer-motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduzir, setReduzir] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduzir(mql.matches);
    onChange();
    // addEventListener é o caminho moderno; mantém compatibilidade simples.
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return reduzir;
}
