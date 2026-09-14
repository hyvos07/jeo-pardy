import { describe, expect, it } from "vitest";
import { gameReducer } from "./machine";
import { createGameState, createInitialState } from "./init";
import { computeRanking, computeScore, computeScores } from "./scoring";
import { CATEGORY_ORDER, TOTAL_CARDS, type GameAction, type GameState } from "./types";

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function playing(teams = 3): GameState {
  return createGameState(teams);
}

/** Invariant PRD §6.3 #6 — total score equals points of awarded played cards. */
function assertScoreIntegrity(state: GameState) {
  const total = Object.values(computeScores(state)).reduce((a, b) => a + b, 0);
  const fromCards = state.cards
    .filter((c) => c.opened && c.awardedTeamId !== null)
    .reduce((sum, c) => sum + c.points, 0);
  const pendingCard = state.cards.find((c) => c.id === state.activeCardId);
  const pending =
    pendingCard && state.pendingAward !== null ? pendingCard.points : 0;
  expect(total).toBe(fromCards + pending);
}

describe("setup", () => {
  it("creates one card per category/points pair", () => {
    const state = playing();
    expect(state.cards).toHaveLength(TOTAL_CARDS);
    const keys = new Set(state.cards.map((c) => `${c.category}-${c.points}`));
    expect(keys.size).toBe(TOTAL_CARDS);
  });

  it("offers the 1/3/5/10 point tiers in every category", () => {
    const state = playing();
    for (const category of CATEGORY_ORDER) {
      const tiers = state.cards
        .filter((c) => c.category === category)
        .map((c) => c.points)
        .sort((a, b) => a - b);
      expect(tiers).toEqual([1, 3, 5, 10]);
    }
  });

  it("clamps team count to 2..10", () => {
    expect(createGameState(1).teams).toHaveLength(2);
    expect(createGameState(99).teams).toHaveLength(10);
    expect(createGameState(4).teams).toHaveLength(4);
  });

  it("starts every team at zero", () => {
    const state = playing(4);
    for (const team of state.teams) {
      expect(computeScore(team.id, state)).toBe(0);
    }
  });

  it("starts the game from home", () => {
    const state = gameReducer(createInitialState(), {
      type: "START_GAME",
      teamCount: 3,
    });
    expect(state.status).toBe("playing");
    expect(state.teams).toHaveLength(3);
  });
});

describe("legal transitions", () => {
  it("single click opens the question", () => {
    const state = run(playing(), { type: "OPEN_CARD", cardId: "ot-1" });
    expect(state.activeCardId).toBe("ot-1");
    expect(state.activeCardState).toBe("question");
  });

  it("reveal moves question to answer", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
    );
    expect(state.activeCardState).toBe("answer");
  });

  it("closing after reveal marks the card played", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
      { type: "CLOSE_CARD" },
    );
    expect(state.activeCardId).toBeNull();
    expect(state.activeCardState).toBeNull();
    expect(state.cards.find((c) => c.id === "ot-1")?.opened).toBe(true);
  });
});

describe("illegal transitions are no-ops", () => {
  it("close does nothing while the question shows (PRD §10.1)", () => {
    const before = run(playing(), { type: "OPEN_CARD", cardId: "ot-1" });
    const after = gameReducer(before, { type: "CLOSE_CARD" });
    expect(after).toEqual(before);
    expect(after.activeCardState).toBe("question");
  });

  it("reveal does nothing without an active card", () => {
    const before = playing();
    expect(gameReducer(before, { type: "REVEAL_ANSWER" })).toEqual(before);
  });

  it("reveal twice does not advance past answer", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
      { type: "REVEAL_ANSWER" },
    );
    expect(state.activeCardState).toBe("answer");
  });

  it("a played card cannot be reopened", () => {
    const played = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
      { type: "CLOSE_CARD" },
    );
    const after = gameReducer(played, { type: "OPEN_CARD", cardId: "ot-1" });
    expect(after.activeCardId).toBeNull();
  });

  it("a second card cannot open over an active one", () => {
    const before = run(playing(), { type: "OPEN_CARD", cardId: "ot-1" });
    const after = gameReducer(before, { type: "OPEN_CARD", cardId: "nt-3" });
    expect(after.activeCardId).toBe("ot-1");
  });

  it("award selection is ignored while the question shows", () => {
    const before = run(playing(), { type: "OPEN_CARD", cardId: "ot-1" });
    const after = gameReducer(before, {
      type: "SET_PENDING_AWARD",
      teamId: "team-1",
    });
    expect(after.pendingAward).toBeNull();
  });

  it("an unknown team cannot be awarded", () => {
    const before = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
    );
    const after = gameReducer(before, {
      type: "SET_PENDING_AWARD",
      teamId: "team-99",
    });
    expect(after.pendingAward).toBeNull();
  });
});

describe("scoring", () => {
  it("awards the card's points to the chosen team", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-3" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-1" },
      { type: "CLOSE_CARD" },
    );
    expect(computeScore("team-1", state)).toBe(3);
    expect(computeScore("team-2", state)).toBe(0);
  });

  it("changing the pick moves the points instead of duplicating them", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-5" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-1" },
      { type: "SET_PENDING_AWARD", teamId: "team-2" },
      { type: "CLOSE_CARD" },
    );
    expect(computeScore("team-1", state)).toBe(0);
    expect(computeScore("team-2", state)).toBe(5);
  });

  it("returning the pick to nobody restores the score", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-5" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-1" },
      { type: "SET_PENDING_AWARD", teamId: null },
    );
    expect(computeScore("team-1", state)).toBe(0);
    assertScoreIntegrity(state);
  });

  it("previews the pending award before the card closes", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-5" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-3" },
    );
    expect(computeScore("team-3", state)).toBe(5);
    expect(state.cards.find((c) => c.id === "ot-5")?.opened).toBe(false);
  });

  it("nobody answering awards no points but still plays the card", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-1" },
      { type: "REVEAL_ANSWER" },
      { type: "CLOSE_CARD" },
    );
    expect(state.cards.find((c) => c.id === "ot-1")?.opened).toBe(true);
    expect(Object.values(computeScores(state)).every((s) => s === 0)).toBe(true);
  });

  it("a card awards points only once", () => {
    let state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-3" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-1" },
      { type: "CLOSE_CARD" },
    );
    // Any further attempt on the same card is rejected upstream.
    state = run(state, { type: "OPEN_CARD", cardId: "ot-3" });
    expect(computeScore("team-1", state)).toBe(3);
  });
});

describe("game completion", () => {
  function playAll(teamId: string | null): GameState {
    let state = playing();
    for (const card of [...state.cards]) {
      state = run(
        state,
        { type: "OPEN_CARD", cardId: card.id },
        { type: "REVEAL_ANSWER" },
        { type: "SET_PENDING_AWARD", teamId },
        { type: "CLOSE_CARD" },
      );
    }
    return state;
  }

  it("finishes automatically after the last card", () => {
    const state = playAll("team-1");
    expect(state.status).toBe("finished");
    expect(state.cards.every((c) => c.opened)).toBe(true);
    // 3 categories x (1+3+5+10)
    expect(computeScore("team-1", state)).toBe(57);
  });

  it("Selesai ends the game early", () => {
    const state = run(playing(), { type: "FINISH_GAME" });
    expect(state.status).toBe("finished");
  });

  it("Selesai during the answer state still commits the pick (PRD §14.2)", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-5" },
      { type: "REVEAL_ANSWER" },
      { type: "SET_PENDING_AWARD", teamId: "team-2" },
      { type: "FINISH_GAME" },
    );
    expect(state.status).toBe("finished");
    expect(computeScore("team-2", state)).toBe(5);
  });

  it("Selesai during the question state awards nothing", () => {
    const state = run(
      playing(),
      { type: "OPEN_CARD", cardId: "ot-5" },
      { type: "FINISH_GAME" },
    );
    expect(state.status).toBe("finished");
    expect(state.cards.find((c) => c.id === "ot-5")?.opened).toBe(false);
    expect(Object.values(computeScores(state)).every((s) => s === 0)).toBe(true);
  });

  it("finished is terminal", () => {
    const finished = run(playing(), { type: "FINISH_GAME" });
    expect(gameReducer(finished, { type: "OPEN_CARD", cardId: "ot-1" })).toEqual(
      finished,
    );
    expect(gameReducer(finished, { type: "FINISH_GAME" })).toEqual(finished);
  });

  it("reset returns to home", () => {
    const state = run(playing(), { type: "FINISH_GAME" }, { type: "RESET" });
    expect(state.status).toBe("home");
    expect(state.cards).toHaveLength(0);
  });
});

describe("ranking", () => {
  function scored(points: Record<string, number>): GameState {
    // Build a finished state by awarding whole cards to teams.
    let state = playing(3);
    const byTeam = Object.entries(points);
    const pool = [...state.cards];

    for (const [teamId, target] of byTeam) {
      let remaining = target;
      while (remaining > 0) {
        const idx = pool.findIndex((c) => c.points <= remaining);
        if (idx === -1) break;
        const card = pool.splice(idx, 1)[0]!;
        remaining -= card.points;
        state = run(
          state,
          { type: "OPEN_CARD", cardId: card.id },
          { type: "REVEAL_ANSWER" },
          { type: "SET_PENDING_AWARD", teamId },
          { type: "CLOSE_CARD" },
        );
      }
    }
    return state;
  }

  it("orders teams by score", () => {
    const state = scored({ "team-1": 2, "team-2": 5, "team-3": 1 });
    const ranking = computeRanking(state);
    expect(ranking.map((r) => r.team.id)).toEqual(["team-2", "team-1", "team-3"]);
  });

  it("marks every top scorer as a winner, with no tie-breaker (PRD §15.2)", () => {
    const state = scored({ "team-1": 5, "team-2": 5, "team-3": 1 });
    const ranking = computeRanking(state);
    const winners = ranking.filter((r) => r.isWinner).map((r) => r.team.id);
    expect(winners.sort()).toEqual(["team-1", "team-2"]);
  });

  it("uses standard competition ranks for ties (1,1,3)", () => {
    const state = scored({ "team-1": 5, "team-2": 5, "team-3": 1 });
    expect(computeRanking(state).map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("declares nobody a winner when every score is zero (PRD §15.3)", () => {
    const state = run(playing(3), { type: "FINISH_GAME" });
    const ranking = computeRanking(state);
    expect(ranking.every((r) => r.score === 0)).toBe(true);
    expect(ranking.some((r) => r.isWinner)).toBe(false);
  });
});

describe("score integrity invariant (PRD §6.3 #6)", () => {
  it("holds across a long mixed sequence", () => {
    let state = playing(4);
    const teamIds = [...state.teams.map((t) => t.id), null];
    let pick = 0;

    for (const card of [...state.cards]) {
      state = run(state, { type: "OPEN_CARD", cardId: card.id });
      assertScoreIntegrity(state);

      state = run(state, { type: "REVEAL_ANSWER" });
      // Flip the choice a few times before settling.
      for (let i = 0; i < 3; i++) {
        state = run(state, {
          type: "SET_PENDING_AWARD",
          teamId: teamIds[pick++ % teamIds.length]!,
        });
        assertScoreIntegrity(state);
      }

      state = run(state, { type: "CLOSE_CARD" });
      assertScoreIntegrity(state);
    }

    expect(state.status).toBe("finished");
  });
});
