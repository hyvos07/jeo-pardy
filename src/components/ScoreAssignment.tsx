import type { Team } from "../game/types";

interface Props {
  teams: Team[];
  points: number;
  value: string | null;
  onChange: (teamId: string | null) => void;
}

const NOBODY = "__nobody__";

export function ScoreAssignment({ teams, points, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="score-assignment"
        className="text-ink-muted text-sm font-medium"
      >
        Berikan poin kepada:
      </label>

      <select
        id="score-assignment"
        aria-label={`Berikan ${points} poin kepada`}
        value={value ?? NOBODY}
        onChange={(e) =>
          onChange(e.target.value === NOBODY ? null : e.target.value)
        }
        className="border-edge bg-surface rounded-button text-ink w-full border px-4 py-3 text-base
                   shadow-sm transition hover:brightness-98"
      >
        {/* Default is "nobody" so a stray selection cannot gift points. */}
        <option value={NOBODY}>Tidak ada yang menjawab</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
