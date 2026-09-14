import { useCallback, useReducer } from "react";
import { AnimatePresence } from "framer-motion";
import { HomeScreen } from "./HomeScreen";
import { GameScreen } from "./GameScreen";
import { ResultsScreen } from "./ResultsScreen";
import { gameReducer } from "../game/machine";
import { createInitialState } from "../game/init";
import { computeRanking } from "../game/scoring";

/**
 * Root island. Screens are driven by `status` rather than routes — game state
 * lives only in memory, so a real route would hand back an empty board on
 * refresh or Back (PRD §22.1).
 */
export default function JeopardyGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(),
  );

  const onStart = useCallback(
    (teamCount: number) => dispatch({ type: "START_GAME", teamCount }),
    [],
  );
  const onOpenCard = useCallback(
    (cardId: string) => dispatch({ type: "OPEN_CARD", cardId }),
    [],
  );
  const onReveal = useCallback(() => dispatch({ type: "REVEAL_ANSWER" }), []);
  const onAward = useCallback(
    (teamId: string | null) => dispatch({ type: "SET_PENDING_AWARD", teamId }),
    [],
  );
  const onCloseCard = useCallback(() => dispatch({ type: "CLOSE_CARD" }), []);
  const onFinish = useCallback(() => dispatch({ type: "FINISH_GAME" }), []);
  const onPlayAgain = useCallback(() => dispatch({ type: "RESET" }), []);

  return (
    <AnimatePresence mode="wait">
      {state.status === "home" && (
        <HomeScreen key="home" pack={state.pack} onStart={onStart} />
      )}

      {state.status === "playing" && (
        <GameScreen
          key="game"
          state={state}
          onOpenCard={onOpenCard}
          onReveal={onReveal}
          onAward={onAward}
          onCloseCard={onCloseCard}
          onFinish={onFinish}
        />
      )}

      {state.status === "finished" && (
        <ResultsScreen
          key="results"
          ranking={computeRanking(state)}
          onPlayAgain={onPlayAgain}
        />
      )}
    </AnimatePresence>
  );
}
