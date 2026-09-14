import { useEffect, useState } from "react";

/** Subscribes to a media query. Returns `false` during SSR. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

/** Touch-first devices, where dblclick is unreliable — PRD §20.1. */
export const useCoarsePointer = () => useMediaQuery("(pointer: coarse)");
