import { createGameState, createInitialState } from "./init";
import type { GameState, GameAction, JeopardyCard } from "./types";

/**
 * Card lifecycle state machine — PRD §10.
 *
 *   BOARD --single click--> QUESTION --double click--> ANSWER --outside--> BOARD
 *
 * Illegal transitions return the state unchanged rather than throwing, so a
 * stray click can never corrupt the lifecycle (PRD §24.5).
 */

/** Commits the active card's pending award and marks it played. */
function commitActiveCard(state: GameState): GameState {
  if (!state.activeCardId) return state;

  const cards: JeopardyCard[] = state.cards.map((card) =>
    card.id === state.activeCardId
      ? { ...card, opened: true, awardedTeamId: state.pendingAward }
      : card,
  );

  return {
    ...state,
    cards,
    activeCardId: null,
    activeCardState: null,
    pendingAward: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.status !== "home") return state;
      return createGameState(action.teamCount, state.pack);
    }

    case "OPEN_CARD": {
      if (state.status !== "playing") return state;
      // Never open a second card on top of an active one.
      if (state.activeCardId !== null) return state;

      const card = state.cards.find((c) => c.id === action.cardId);
      if (!card) return state;

      // A played card can be reopened to correct a misrecorded award. It goes
      // straight to the answer with its previous pick preselected, so the
      // moderator sees what was recorded rather than a blank dropdown that
      // would silently drop the points on close.
      const replay = card.opened;

      return {
        ...state,
        activeCardId: card.id,
        activeCardState: replay ? "answer" : "question",
        pendingAward: replay ? card.awardedTeamId : null,
      };
    }

    case "REVEAL_ANSWER": {
      if (state.activeCardState !== "question") return state;
      return { ...state, activeCardState: "answer" };
    }

    case "SET_PENDING_AWARD": {
      // Only meaningful once the answer is showing.
      if (state.activeCardState !== "answer") return state;
      if (
        action.teamId !== null &&
        !state.teams.some((t) => t.id === action.teamId)
      ) {
        return state;
      }
      return { ...state, pendingAward: action.teamId };
    }

    case "CLOSE_CARD": {
      // PRD §10.1 — closing is not allowed while the question is showing.
      if (state.activeCardState !== "answer") return state;
      return commitActiveCard(state);
    }

    case "FINISH_GAME": {
      if (state.status !== "playing") return state;
      // PRD §14.2 — an answer-state pick is honoured; a question-state card
      // awards nothing and stays unplayed.
      const committed =
        state.activeCardState === "answer" ? commitActiveCard(state) : state;

      return {
        ...committed,
        status: "finished",
        activeCardId: null,
        activeCardState: null,
        pendingAward: null,
      };
    }

    case "RESET":
      return createInitialState(state.pack);

    default:
      return state;
  }
}
