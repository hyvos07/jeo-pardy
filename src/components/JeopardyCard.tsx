import type { JeopardyCard as Card } from "../game/types";

interface Props {
  card: Card;
  categoryLabel: string;
  /** 0 = cheapest tier, 1 = dearest. Drives shading without hard-coded values. */
  tierRatio: number;
  disabled: boolean;
  onOpen: (cardId: string) => void;
  registerRef: (cardId: string, el: HTMLButtonElement | null) => void;
}

/**
 * A board tile. Only the point value is ever shown here (PRD §9).
 *
 * This element carries the SINGLE click handler. The double-click handler
 * lives on the modal card instead, so the two never fight (PRD §10.2).
 */
export function JeopardyCardTile({
  card,
  categoryLabel,
  tierRatio,
  disabled,
  onOpen,
  registerRef,
}: Props) {
  const played = card.opened;
  // Upper half of the tiers shifts to the lighter blue; the dearest tier alone
  // gets a warm border. Both are relative to the pack, so any point scale works.
  const upperHalf = tierRatio > 0.5;
  const dearest = tierRatio === 1;

  const base =
    "border-edge bg-surface rounded-card flex aspect-square w-full flex-col items-center justify-center border";

  return (
    <button
      ref={(el) => registerRef(card.id, el)}
      type="button"
      disabled={disabled || played}
      aria-disabled={played || undefined}
      tabIndex={played ? -1 : undefined}
      aria-label={
        played
          ? `${categoryLabel}, ${card.points} poin, sudah dimainkan`
          : `${categoryLabel}, ${card.points} poin`
      }
      onClick={() => onOpen(card.id)}
      className={
        played
          ? `${base} text-ink-muted/50 cursor-default text-2xl opacity-40`
          : `${base} shadow-sm transition duration-150 ease-out
             hover:enabled:-translate-y-0.5 hover:enabled:scale-103 hover:enabled:shadow-md
             active:enabled:scale-100
             ${
               // The dearest tier reads a touch warmer, never loud enough to
               // telegraph difficulty (PRD §18).
               dearest ? "border-accent/30" : ""
             }`
      }
    >
      {played ? (
        <span aria-hidden="true">✓</span>
      ) : (
        // The number carries the weight; "Poin" is a quiet unit label.
        <span className="flex flex-col items-center leading-none">
          <span
            className={`text-4xl font-bold tracking-tight tabular-nums sm:text-5xl lg:text-6xl ${
              upperHalf ? "text-secondary" : "text-primary"
            }`}
          >
            {card.points}
          </span>
          <span className="text-ink-muted mt-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase sm:mt-2 sm:text-xs">
            Poin
          </span>
        </span>
      )}
    </button>
  );
}
