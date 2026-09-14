/** Domain types — PRD §6.1. No React here; this layer stays testable on its own. */

export type CategorySlug = "old_testament" | "new_testament" | "apostle";
export type CardPoints = 1 | 3 | 5 | 10;
export type ActiveCardState = "question" | "answer";
export type GameStatus = "home" | "playing" | "finished";

export interface Team {
  id: string;
  name: string;
}

export interface JeopardyCard {
  id: string;
  category: CategorySlug;
  points: CardPoints;
  question: string;
  image?: string;
  imageAlt?: string;
  answer: string;
  opened: boolean;
  /** Team the points went to, or null for "nobody answered". */
  awardedTeamId: string | null;
}

export interface GameState {
  status: GameStatus;
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

export const CATEGORY_ORDER: CategorySlug[] = [
  "old_testament",
  "new_testament",
  "apostle",
];

export const CATEGORY_LABEL: Record<CategorySlug, string> = {
  old_testament: "Perjanjian Lama",
  new_testament: "Perjanjian Baru",
  apostle: "Tokoh Rasul",
};

export const POINT_ORDER: CardPoints[] = [1, 3, 5, 10];

/** 3 categories x 4 point tiers. */
export const TOTAL_CARDS = CATEGORY_ORDER.length * POINT_ORDER.length;

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 10;
export const DEFAULT_TEAMS = 2;
