import type { CardPoints, CategorySlug } from "../game/types";

/**
 * Question content — PRD §23. Kept apart from the UI so it can be swapped
 * without touching components.
 *
 * These are PLACEHOLDERS. Replace `question` and `answer` with real content
 * before playing. Difficulty rises with the point value:
 *    1 — very well-known figures (Adam, Nuh, Musa, Yesus, Petrus)
 *    3 — moderately known, needs more specific knowledge
 *    5 — lesser known, harder to identify
 *   10 — the hardest; obscure figures or fine detail
 *
 * `image` is optional; when set, `imageAlt` is required.
 */
export interface QuestionSeed {
  id: string;
  category: CategorySlug;
  points: CardPoints;
  question: string;
  answer: string;
  image?: string;
  imageAlt?: string;
}

const CATEGORY_NAME: Record<CategorySlug, string> = {
  old_testament: "Perjanjian Lama",
  new_testament: "Perjanjian Baru",
  apostle: "Tokoh Rasul",
};

const PREFIX: Record<CategorySlug, string> = {
  old_testament: "ot",
  new_testament: "nt",
  apostle: "ap",
};

/** Builds a clearly-marked placeholder so it can never pass for a real question. */
function placeholder(category: CategorySlug, points: CardPoints): QuestionSeed {
  const name = CATEGORY_NAME[category];
  return {
    id: `${PREFIX[category]}-${points}`,
    category,
    points,
    question: `[Pertanyaan ${points} poin — ${name}]`,
    answer: `[Jawaban ${points} poin — ${name}]`,
  };
}

export const questionSeeds: QuestionSeed[] = [
  // Perjanjian Lama
  placeholder("old_testament", 1),
  placeholder("old_testament", 3),
  placeholder("old_testament", 5),
  placeholder("old_testament", 10),

  // Perjanjian Baru
  placeholder("new_testament", 1),
  placeholder("new_testament", 3),
  placeholder("new_testament", 5),
  placeholder("new_testament", 10),

  // Tokoh Rasul
  placeholder("apostle", 1),
  placeholder("apostle", 3),
  placeholder("apostle", 5),
  placeholder("apostle", 10),
];
