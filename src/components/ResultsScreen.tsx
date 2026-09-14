import { motion } from "framer-motion";
import { Confetti } from "./Confetti";
import { useReducedMotion } from "./useMediaQuery";
import type { RankedTeam } from "../game/scoring";

interface Props {
  ranking: RankedTeam[];
  onPlayAgain: () => void;
}

export function ResultsScreen({ ranking, onPlayAgain }: Props) {
  const reduced = useReducedMotion();
  const winners = ranking.filter((r) => r.isWinner);
  const rest = ranking.filter((r) => !r.isWinner);
  const nobodyWon = winners.length === 0;

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0.15 : 0.4,
      delay: reduced ? 0 : delay,
      ease: "easeOut" as const,
    },
  });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-12 px-6 py-16">
      {/* Confetti is skipped entirely under reduced motion, and when the
          game ended with nobody scoring (PRD §15.3). */}
      {!reduced && !nobodyWon && <Confetti />}

      <motion.h1
        {...fadeUp(0)}
        className="text-primary text-center text-3xl font-bold tracking-tight sm:text-4xl"
      >
        {nobodyWon ? "Tidak ada pemenang" : "Final Ranking"}
      </motion.h1>

      {nobodyWon ? (
        <motion.ul
          {...fadeUp(0.12)}
          className="flex w-full max-w-md flex-col gap-2"
        >
          {ranking.map((entry) => (
            <PlainRow key={entry.team.id} entry={entry} />
          ))}
        </motion.ul>
      ) : (
        <>
          <motion.section
            {...fadeUp(0.15)}
            className="flex flex-wrap items-end justify-center gap-6"
            aria-label={winners.length > 1 ? "Pemenang" : "Pemenang"}
          >
            {winners.map((entry, i) => (
              <WinnerCard
                key={entry.team.id}
                entry={entry}
                solo={winners.length === 1}
                delay={reduced ? 0 : 0.3 + i * 0.12}
                reduced={reduced}
              />
            ))}
          </motion.section>

          {rest.length > 0 && (
            <motion.ul
              {...fadeUp(0.55)}
              className="flex w-full max-w-md flex-col gap-2"
            >
              {rest.map((entry) => (
                <PlainRow key={entry.team.id} entry={entry} />
              ))}
            </motion.ul>
          )}
        </>
      )}

      <motion.button
        {...fadeUp(0.7)}
        type="button"
        onClick={onPlayAgain}
        className="border-edge bg-surface rounded-button text-primary border px-8 py-3 text-base font-semibold shadow-sm transition
                   hover:brightness-98 active:scale-98"
      >
        Main Lagi
      </motion.button>
    </main>
  );
}

function WinnerCard({
  entry,
  solo,
  delay,
  reduced,
}: {
  entry: RankedTeam;
  solo: boolean;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: reduced ? 1 : 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0.15 : 0.45, delay, ease: "easeOut" }}
      className="border-accent/40 bg-surface rounded-card flex flex-col items-center gap-2 border px-8 py-8 shadow-[0_8px_32px_rgb(198_161_91/0.25)] sm:px-12"
    >
      <span aria-hidden="true" className="text-4xl sm:text-5xl">
        🏆
      </span>
      <span className="text-accent text-[11px] font-bold tracking-[0.2em] uppercase">
        Winner
      </span>
      <span
        className={`text-primary font-bold ${solo ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
      >
        {entry.team.name}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={`text-secondary font-bold tabular-nums ${solo ? "text-4xl sm:text-5xl" : "text-3xl"}`}
        >
          {entry.score}
        </span>
        <span className="text-ink-muted text-xs font-semibold tracking-[0.14em] uppercase">
          Poin
        </span>
      </span>
    </motion.div>
  );
}

function PlainRow({ entry }: { entry: RankedTeam }) {
  return (
    <li className="border-edge bg-surface rounded-button flex items-center justify-between border px-5 py-3">
      <span className="flex items-baseline gap-3">
        <span className="text-ink-muted w-5 text-sm tabular-nums">
          {entry.rank}
        </span>
        <span className="text-ink font-medium">{entry.team.name}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-primary text-lg font-bold tabular-nums">
          {entry.score}
        </span>
        <span className="text-ink-muted text-[10px] font-semibold tracking-[0.14em] uppercase">
          Poin
        </span>
      </span>
    </li>
  );
}
