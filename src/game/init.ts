import { questionSeeds } from "../content/questions";
import {
  MAX_TEAMS,
  MIN_TEAMS,
  type GameState,
  type JeopardyCard,
  type Team,
} from "./types";

export function createTeams(count: number): Team[] {
  const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.trunc(count)));
  return Array.from({ length: clamped }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Tim ${i + 1}`,
  }));
}

export function createCards(): JeopardyCard[] {
  return questionSeeds.map((seed) => ({
    ...seed,
    opened: false,
    awardedTeamId: null,
  }));
}

export function createInitialState(): GameState {
  return {
    status: "home",
    teams: [],
    cards: [],
    activeCardId: null,
    activeCardState: null,
    pendingAward: null,
  };
}

export function createGameState(teamCount: number): GameState {
  return {
    status: "playing",
    teams: createTeams(teamCount),
    cards: createCards(),
    activeCardId: null,
    activeCardState: null,
    pendingAward: null,
  };
}
