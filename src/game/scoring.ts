import type { GameState, Team } from "./types";

/**
 * Score is DERIVED from `cards`, never accumulated — PRD §12.3.
 *
 * This is what makes changing the dropdown selection correct without any
 * undo logic: the previous pick simply stops matching. Writing
 * `team.score += points` anywhere would reintroduce the double-award bug.
 */
export function computeScore(teamId: string, state: GameState): number {
  // The active card is scored solely by `pendingAward`, even when it has been
  // played before and reopened for a correction — otherwise its points would
  // count twice while the moderator is changing the pick.
  const committed = state.cards
    .filter(
      (c) => c.opened && c.id !== state.activeCardId && c.awardedTeamId === teamId,
    )
    .reduce((sum, c) => sum + c.points, 0);

  const activeCard = state.cards.find((c) => c.id === state.activeCardId);
  const pending =
    activeCard && state.pendingAward === teamId ? activeCard.points : 0;

  return committed + pending;
}

export function computeScores(state: GameState): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const team of state.teams) {
    scores[team.id] = computeScore(team.id, state);
  }
  return scores;
}

export interface RankedTeam {
  team: Team;
  score: number;
  /** Standard competition ranking: ties share a rank, next rank skips (1,1,3). */
  rank: number;
  isWinner: boolean;
}

/**
 * Ranking with no tie-breaker — PRD §15.2. Every team sharing the top score
 * is a winner; we never invent an ordering between them.
 *
 * Exception (PRD §15.3): if the top score is 0, nobody won.
 */
export function computeRanking(state: GameState): RankedTeam[] {
  const scores = computeScores(state);
  const sorted = [...state.teams].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
  );

  const topScore = sorted.length ? (scores[sorted[0]!.id] ?? 0) : 0;
  const hasWinner = topScore > 0;

  const ranked: RankedTeam[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;

  sorted.forEach((team, index) => {
    const score = scores[team.id] ?? 0;
    const rank = score === lastScore ? lastRank : index + 1;
    lastScore = score;
    lastRank = rank;

    ranked.push({
      team,
      score,
      rank,
      isWinner: hasWinner && score === topScore,
    });
  });

  return ranked;
}

export function hasWinner(ranking: RankedTeam[]): boolean {
  return ranking.some((r) => r.isWinner);
}
