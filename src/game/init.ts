import { quizPack } from "../content/pack";
import { freshCards } from "./pack";
import { MAX_TEAMS, MIN_TEAMS, type GameState, type QuizPack, type Team } from "./types";

export function createTeams(count: number): Team[] {
  const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.trunc(count)));
  return Array.from({ length: clamped }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Tim ${i + 1}`,
  }));
}

export function createInitialState(pack: QuizPack = quizPack): GameState {
  return {
    status: "home",
    pack,
    teams: [],
    cards: [],
    activeCardId: null,
    activeCardState: null,
    pendingAward: null,
  };
}

export function createGameState(
  teamCount: number,
  pack: QuizPack = quizPack,
): GameState {
  return {
    status: "playing",
    pack,
    teams: createTeams(teamCount),
    cards: freshCards(pack),
    activeCardId: null,
    activeCardState: null,
    pendingAward: null,
  };
}
