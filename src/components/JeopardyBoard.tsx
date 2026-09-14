import { JeopardyCardTile } from "./JeopardyCard";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  POINT_ORDER,
  type JeopardyCard,
} from "../game/types";

interface Props {
  cards: JeopardyCard[];
  disabled: boolean;
  onOpen: (cardId: string) => void;
  registerRef: (cardId: string, el: HTMLButtonElement | null) => void;
}

export function JeopardyBoard({
  cards,
  disabled,
  onOpen,
  registerRef,
}: Props) {
  const find = (category: string, points: number) =>
    cards.find((c) => c.category === category && c.points === points);

  return (
    /* Cards are square, so the board's height drives its width. Chrome
       (the combined score/title/Selesai bar plus headings) measures a
       constant ~7.7rem; with 4 rows of 12px gaps, width = 0.73 x the height
       that remains keeps all twelve on screen without scrolling. */
    <div className="mx-auto grid w-full grid-cols-1 gap-4 sm:max-w-[min(64rem,calc((100dvh-8.5rem)*0.73))] sm:grid-cols-3 sm:gap-4">
      {CATEGORY_ORDER.map((category) => (
        <section key={category} className="flex flex-col gap-2.5 sm:gap-3">
          <h2 className="text-primary text-center text-xs font-semibold tracking-wide whitespace-nowrap uppercase sm:text-sm">
            {CATEGORY_LABEL[category]}
          </h2>

          {/* Stacks vertically on desktop; a 4-across row on narrow screens. */}
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-1 sm:gap-3">
            {POINT_ORDER.map((points) => {
              const card = find(category, points);
              if (!card) return null;
              return (
                <JeopardyCardTile
                  key={card.id}
                  card={card}
                  disabled={disabled}
                  onOpen={onOpen}
                  registerRef={registerRef}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
