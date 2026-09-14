import { MAX_TEAMS, MIN_TEAMS } from "../game/types";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function TeamCountInput({ value, onChange }: Props) {
  const canDecrease = value > MIN_TEAMS;
  const canIncrease = value < MAX_TEAMS;

  const step = (delta: number) => {
    const next = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, value + delta));
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <span id="team-count-label" className="text-ink-muted text-base">
        Jumlah Tim
      </span>

      <div className="border-edge bg-surface flex items-center gap-2 rounded-pill border p-2 shadow-sm">
        <StepButton
          label="Kurangi jumlah tim"
          disabled={!canDecrease}
          onClick={() => step(-1)}
        >
          −
        </StepButton>

        <output
          aria-labelledby="team-count-label"
          aria-live="polite"
          className="text-primary w-16 text-center text-3xl font-bold tabular-nums"
        >
          {value}
        </output>

        <StepButton
          label="Tambah jumlah tim"
          disabled={!canIncrease}
          onClick={() => step(1)}
        >
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-primary-soft text-primary flex h-12 w-12 items-center justify-center rounded-full text-2xl font-semibold transition
                 hover:brightness-97 active:scale-95
                 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:brightness-100 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
