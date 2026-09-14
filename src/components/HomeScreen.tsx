import { useState } from "react";
import { motion } from "framer-motion";
import { TeamCountInput } from "./TeamCountInput";
import { DEFAULT_TEAMS } from "../game/types";
import { useReducedMotion } from "./useMediaQuery";

interface Props {
  onStart: (teamCount: number) => void;
}

export function HomeScreen({ onStart }: Props) {
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
        <h1 className="text-primary text-4xl font-bold tracking-tight sm:text-5xl">
          Bible Jeopardy
        </h1>
        <p className="text-ink-muted mt-3 text-base">
          Uji pengetahuanmu tentang Alkitab
        </p>
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
