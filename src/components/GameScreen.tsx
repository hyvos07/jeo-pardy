import { useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ScoreIndicator } from "./ScoreIndicator";
import { JeopardyBoard } from "./JeopardyBoard";
import { ActiveCardOverlay } from "./ActiveCardOverlay";
import { computeScores } from "../game/scoring";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  onOpenCard: (cardId: string) => void;
  onReveal: () => void;
  onAward: (teamId: string | null) => void;
  onCloseCard: () => void;
  onFinish: () => void;
}

export function GameScreen({
  state,
  onOpenCard,
  onReveal,
  onAward,
  onCloseCard,
  onFinish,
}: Props) {
  const scores = computeScores(state);
  const activeCard = state.cards.find((c) => c.id === state.activeCardId);

  // Remembers which tile opened the modal, so focus can return there.
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastOpened = useRef<string | null>(null);

  const registerRef = useCallback(
    (cardId: string, el: HTMLButtonElement | null) => {
      if (el) tileRefs.current.set(cardId, el);
      else tileRefs.current.delete(cardId);
    },
    [],
  );

  const handleOpen = useCallback(
    (cardId: string) => {
      lastOpened.current = cardId;
      onOpenCard(cardId);
    },
    [onOpenCard],
  );

  const handleClose = useCallback(() => {
    const id = lastOpened.current;
    onCloseCard();
    // Restore focus after the tile re-renders in its played state.
    requestAnimationFrame(() => {
      if (id) tileRefs.current.get(id)?.focus();
    });
  }, [onCloseCard]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Title and Selesai ride along the score bar so the board keeps as
          much vertical room as possible — the cards are the point. */}
      <ScoreIndicator
        teams={state.teams}
        scores={scores}
        title={
          <h1 className="text-primary text-lg font-bold tracking-tight sm:text-xl">
            Bible Jeopardy
          </h1>
        }
        action={
          <button
            type="button"
            onClick={onFinish}
            className="border-edge bg-surface rounded-button text-primary shrink-0 border px-5 py-2 text-sm font-semibold shadow-sm transition
                       hover:brightness-98 active:scale-98"
          >
            Selesai
          </button>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6">
        <JeopardyBoard
          cards={state.cards}
          disabled={state.activeCardId !== null}
          onOpen={handleOpen}
          registerRef={registerRef}
        />
      </main>

      <AnimatePresence>
        {activeCard && state.activeCardState && (
          <ActiveCardOverlay
            key={activeCard.id}
            card={activeCard}
            state={state.activeCardState}
            teams={state.teams}
            pendingAward={state.pendingAward}
            onReveal={onReveal}
            onAward={onAward}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
