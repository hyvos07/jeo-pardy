import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Team } from "../game/types";
import { useReducedMotion } from "./useMediaQuery";

interface Props {
  teams: Team[];
  scores: Record<string, number>;
  title?: React.ReactNode;
  action?: React.ReactNode;
}

export function ScoreIndicator({ teams, scores, title, action }: Props) {
  return (
    <div className="border-edge bg-surface/80 sticky top-0 z-10 border-b backdrop-blur">
      {/* Mobile: two rows (title + button, then scores). Desktop: one row.
          Grid rather than flex-wrap, so the breakpoint switch is explicit. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:grid-cols-[auto_1fr_auto] sm:px-6">
        {title}

        <div className="justify-self-end sm:order-3">{action}</div>

        <ul className="col-span-2 flex min-w-0 gap-4 overflow-x-auto pb-0.5 sm:order-2 sm:col-span-1 [scrollbar-width:thin]">
          {teams.map((team) => (
            <TeamScore
              key={team.id}
              name={team.name}
              score={scores[team.id] ?? 0}
            />
          ))}
        </ul>
      </div>

      {/* Announced separately so the visual delta stays purely decorative. */}
      <p aria-live="polite" className="sr-only">
        {teams.map((t) => `${t.name} ${scores[t.id] ?? 0}`).join(", ")}
      </p>
    </div>
  );
}

function TeamScore({ name, score }: { name: string; score: number }) {
  const reduced = useReducedMotion();
  const previous = useRef(score);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const diff = score - previous.current;
    previous.current = score;
    if (diff === 0 || reduced) return;

    setDelta(diff);
    const timer = window.setTimeout(() => setDelta(null), 600);
    return () => window.clearTimeout(timer);
  }, [score, reduced]);

  return (
    <li className="flex shrink-0 items-baseline gap-2">
      <span className="text-ink-muted text-sm whitespace-nowrap">{name}</span>

      <span className="relative">
        <span className="text-primary text-lg font-bold tabular-nums">
          {score}
        </span>

        <AnimatePresence>
          {delta !== null && (
            <motion.span
              key={`${score}-${delta}`}
              aria-hidden="true"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: -10 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`absolute -top-1 left-full ml-1 text-xs font-semibold whitespace-nowrap ${
                delta > 0 ? "text-accent" : "text-ink-muted"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </li>
  );
}
