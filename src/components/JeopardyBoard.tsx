import { JeopardyCardTile } from "./JeopardyCard";
import type { Category, JeopardyCard } from "../game/types";

interface Props {
  categories: Category[];
  points: number[];
  cards: JeopardyCard[];
  disabled: boolean;
  onOpen: (cardId: string) => void;
  registerRef: (cardId: string, el: HTMLButtonElement | null) => void;
}

export function JeopardyBoard({
  categories,
  points,
  cards,
  disabled,
  onOpen,
  registerRef,
}: Props) {
  const find = (categoryId: string, value: number) =>
    cards.find((c) => c.category === categoryId && c.points === value);

  const rows = points.length;
  const columns = categories.length;

  return (
    /* Cards are square, so the board's height drives its width: `rows` rows
       plus gaps must clear the chrome (~7.7rem for the bar and headings).
       The ratio converts remaining height into the matching width, and
       scales with the pack's shape rather than assuming a 3x4 grid. */
    <div
      className="mx-auto grid w-full grid-cols-1 gap-4 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))] sm:gap-4"
      style={
        {
          "--cols": columns,
          "--board-max": `min(64rem, calc((100dvh - 8.5rem) * ${(columns / rows).toFixed(3)}))`,
          maxWidth: "var(--board-max)",
        } as React.CSSProperties
      }
    >
      {categories.map((category) => (
        <section key={category.id} className="flex flex-col gap-2.5 sm:gap-3">
          <h2 className="text-primary text-center text-xs font-semibold tracking-wide text-balance uppercase sm:text-sm">
            {category.label}
          </h2>

          {/* Stacks vertically on desktop; one row per category when narrow. */}
          <div
            className="grid grid-cols-[repeat(var(--rows),minmax(0,1fr))] gap-2.5 sm:grid-cols-1 sm:gap-3"
            style={{ "--rows": rows } as React.CSSProperties}
          >
            {points.map((value, tier) => {
              const card = find(category.id, value);
              if (!card) return null;
              return (
                <JeopardyCardTile
                  key={card.id}
                  card={card}
                  categoryLabel={category.label}
                  tierRatio={rows > 1 ? tier / (rows - 1) : 0}
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
