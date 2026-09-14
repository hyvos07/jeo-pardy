/** Domain types — PRD §6.1. No React here; this layer stays testable on its own. */

export type ActiveCardState = "question" | "answer";
export type GameStatus = "home" | "playing" | "finished";

export interface Team {
  id: string;
  name: string;
}

/** One column of the board, as declared in the quiz pack. */
export interface Category {
  id: string;
  label: string;
}

export interface JeopardyCard {
  id: string;
  /** Matches a `Category.id`. */
  category: string;
  points: number;
  question: string;
  image?: string;
  imageAlt?: string;
  answer: string;
  opened: boolean;
  /** Team the points went to, or null for "nobody answered". */
  awardedTeamId: string | null;
}

/**
 * A loaded quiz pack: the board's shape and content, read from JSON so a game
 * can be about anything without touching code.
 */
export interface QuizPack {
  title: string;
  subtitle?: string;
  categories: Category[];
  /** Point tiers, one card per tier per category, low to high. */
  points: number[];
  cards: JeopardyCard[];
}

export interface GameState {
  status: GameStatus;
  pack: QuizPack;
  teams: Team[];
  cards: JeopardyCard[];
  activeCardId: string | null;
  activeCardState: ActiveCardState | null;
  /** Dropdown selection before it is committed on close — PRD §12.3. */
  pendingAward: string | null;
}

export type GameAction =
  | { type: "START_GAME"; teamCount: number }
  | { type: "OPEN_CARD"; cardId: string }
  | { type: "REVEAL_ANSWER" }
  | { type: "SET_PENDING_AWARD"; teamId: string | null }
  | { type: "CLOSE_CARD" }
  | { type: "FINISH_GAME" }
  | { type: "RESET" };

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 10;
export const DEFAULT_TEAMS = 2;

/** Board limits that keep the layout legible. */
export const MIN_CATEGORIES = 1;
export const MAX_CATEGORIES = 6;
export const MIN_POINT_TIERS = 1;
export const MAX_POINT_TIERS = 8;
