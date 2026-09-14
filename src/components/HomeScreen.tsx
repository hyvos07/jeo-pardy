import { useState } from "react";
import { motion } from "framer-motion";
import { TeamCountInput } from "./TeamCountInput";
import { DEFAULT_TEAMS, type QuizPack } from "../game/types";
import { useReducedMotion } from "./useMediaQuery";

interface Props {
  pack: QuizPack;
  onStart: (teamCount: number) => void;
}

export function HomeScreen({ pack, onStart }: Props) {
  const [teamCount, setTeamCount] = useState(DEFAULT_TEAMS);
  const reduced = useReducedMotion();

  return (
    <motion.main
      initial={{ opacity: 0, y: reduced ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.4, ease: "easeOut" }}
      className="flex min-h-dvh flex-col items-center justify-center gap-12 px-6 py-16"
    >
      <header className="text-center">
        <h1 className="text-primary text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {pack.title}
        </h1>
        {pack.subtitle && (
          <p className="text-ink-muted mt-3 text-base text-balance">
            {pack.subtitle}
          </p>
        )}
      </header>

      <TeamCountInput value={teamCount} onChange={setTeamCount} />

      <button
        type="button"
        onClick={() => onStart(teamCount)}
        className="bg-primary rounded-button px-12 py-4 text-lg font-semibold text-white shadow-md transition
                   hover:brightness-115 active:scale-98"
      >
        Mulai
      </button>
    </motion.main>
  );
}
