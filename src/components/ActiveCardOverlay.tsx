import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ScoreAssignment } from "./ScoreAssignment";
import { useCoarsePointer, useReducedMotion } from "./useMediaQuery";
import type { ActiveCardState, JeopardyCard, Team } from "../game/types";

interface Props {
  card: JeopardyCard;
  state: ActiveCardState;
  teams: Team[];
  pendingAward: string | null;
  onReveal: () => void;
  onAward: (teamId: string | null) => void;
  onClose: () => void;
}

const FLIP_MS = 700;

export function ActiveCardOverlay({
  card,
  state,
  teams,
  pendingAward,
  onReveal,
  onAward,
  onClose,
}: Props) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const dialogRef = useRef<HTMLDivElement>(null);

  const isAnswer = state === "answer";

  /**
   * Both faces are mounted and rotate together through a full 180°, each with
   * its backface hidden — the card genuinely turns over rather than swinging
   * out and back (PRD §19.2).
   *
   * The answer face still only renders its text once `state` is "answer", so
   * the answer is never in the DOM early (PRD §11).
   */
  const [measured, setMeasured] = useState(0);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Absolutely-positioned faces have no height of their own, so the flip
  // container is sized to whichever face is showing.
  useLayoutEffect(() => {
    const el = isAnswer ? backRef.current : frontRef.current;
    if (!el) return;

    const sync = () => setMeasured(el.offsetHeight);
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isAnswer, card.id]);

  // Keyboard map — PRD §21.1. Escape is deliberately inert on the question.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state === "answer") {
          e.preventDefault();
          onClose();
        }
        return; // question state: swallow it, do nothing
      }

      if ((e.key === "Enter" || e.key === " ") && state === "question") {
        // Don't hijack Enter/Space aimed at a real control.
        const target = e.target as HTMLElement | null;
        if (target?.closest("button, select, a, input, textarea")) return;
        e.preventDefault();
        onReveal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state, onReveal, onClose]);

  // Focus trap — PRD §21.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    node.focus();

    const onFocusIn = (e: FocusEvent) => {
      if (!node.contains(e.target as Node)) {
        node.focus();
      }
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <motion.div
        // Backdrop. On the question state a click here is ignored entirely —
        // no shake, no flash, no hint (PRD §13.1).
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.25, ease: "easeOut" }}
        onClick={() => {
          if (state === "answer") onClose();
        }}
        className="absolute inset-0 bg-[#1b2a63]/55 backdrop-blur-[2px]"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Kartu ${card.points} poin`}
        tabIndex={-1}
        initial={{ opacity: 0, scale: reduced ? 1 : 0.92, y: reduced ? 0 : 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 8 }}
        transition={{ duration: reduced ? 0.15 : 0.32, ease: "easeOut" }}
        // Double click reveals — PRD §4.2. This handler exists only here.
        onDoubleClick={() => {
          if (state === "question") onReveal();
        }}
        className="relative w-full max-w-2xl outline-none"
        style={{ perspective: 2000 }}
      >
        <motion.div
          animate={{
            rotateY: isAnswer ? 180 : 0,
            height: measured || undefined,
            // A slight lift and tilt at the midpoint: the card comes off the
            // table as it turns, rather than spinning flat in place.
            scale: isAnswer ? [1, 0.94, 1] : 1,
            rotateX: isAnswer ? [0, 8, 0] : 0,
          }}
          transition={
            reduced
              ? { duration: 0.15 }
              : {
                  // Symmetric easing keeps the turn readable end to end;
                  // a front-loaded curve makes it snap and lose the gesture.
                  rotateY: { duration: FLIP_MS / 1000, ease: [0.45, 0.05, 0.35, 1] },
                  scale: { duration: FLIP_MS / 1000, ease: "easeInOut" },
                  rotateX: { duration: FLIP_MS / 1000, ease: "easeInOut" },
                  height: { duration: 0.35, ease: "easeOut" },
                }
          }
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full"
        >
          {/* Front — the question. */}
          <CardFace ref={frontRef} hidden={isAnswer} rotated={false}>
            <FaceLabel>{card.points} Poin</FaceLabel>
            <QuestionFace card={card} coarse={coarse} onReveal={onReveal} />
          </CardFace>

          {/* Back — pre-rotated so it reads correctly once the card turns. */}
          <CardFace ref={backRef} hidden={!isAnswer} rotated>
            <FaceLabel>Jawaban</FaceLabel>
            {isAnswer && (
              <AnswerFace
                card={card}
                teams={teams}
                pendingAward={pendingAward}
                onAward={onAward}
              />
            )}
          </CardFace>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** One side of the card. Backface-hidden so only the face toward you paints. */
const CardFace = forwardRef<
  HTMLDivElement,
  { hidden: boolean; rotated: boolean; children: React.ReactNode }
>(function CardFace({ hidden, rotated, children }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden={hidden || undefined}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: rotated ? "rotateY(180deg)" : undefined,
        // The showing face is in flow and sets the height; the other floats.
        position: hidden ? "absolute" : "relative",
        inset: hidden ? 0 : undefined,
      }}
      className="bg-surface rounded-card max-h-[85dvh] w-full overflow-y-auto p-8 shadow-2xl sm:p-12"
    >
      {children}
    </div>
  );
});

function FaceLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-accent mb-6 text-center text-sm font-bold tracking-[0.18em] uppercase">
      {children}
    </p>
  );
}

function QuestionFace({
  card,
  coarse,
  onReveal,
}: {
  card: JeopardyCard;
  coarse: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-ink text-center text-2xl leading-snug font-medium sm:text-3xl">
        {card.question}
      </p>

      {card.image && (
        <img
          src={card.image}
          alt={card.imageAlt ?? ""}
          className="rounded-card max-h-64 w-auto object-contain"
        />
      )}

      {/* Touch devices get a real control; dblclick is unreliable there.
          Hidden on precise pointers so desktop keeps the pure gesture. */}
      {coarse && (
        <button
          type="button"
          onClick={onReveal}
          className="bg-primary rounded-button px-8 py-3 text-base font-semibold text-white shadow-md transition active:scale-98"
        >
          Lihat Jawaban
        </button>
      )}
    </div>
  );
}

function AnswerFace({
  card,
  teams,
  pendingAward,
  onAward,
}: {
  card: JeopardyCard;
  teams: Team[];
  pendingAward: string | null;
  onAward: (teamId: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <p className="text-primary text-center text-3xl font-bold sm:text-4xl">
        {card.answer}
      </p>

      <ScoreAssignment
        teams={teams}
        points={card.points}
        value={pendingAward}
        onChange={onAward}
      />
    </div>
  );
}
