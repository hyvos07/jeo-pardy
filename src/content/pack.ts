import rawPack from "./questions.json";
import { parseQuizPack } from "../game/pack";

/**
 * The active quiz pack. Edit `questions.json` to change the title, the board's
 * shape, or the questions — no code changes needed.
 *
 * Parsing happens at module load, so a malformed pack fails at build/startup
 * rather than halfway through a game.
 */
export const quizPack = parseQuizPack(rawPack);
