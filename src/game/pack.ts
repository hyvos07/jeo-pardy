import {
  MAX_CATEGORIES,
  MAX_POINT_TIERS,
  MIN_CATEGORIES,
  MIN_POINT_TIERS,
  type Category,
  type JeopardyCard,
  type QuizPack,
} from "./types";

/**
 * Loads and validates a quiz pack from JSON.
 *
 * Validation is strict and fails loudly: a malformed pack discovered mid-game
 * (a missing card, a duplicate tier) is far worse than one caught at startup.
 */

export class QuizPackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizPackError";
  }
}

/** The raw shape as written in JSON, before validation. */
interface RawPack {
  title?: unknown;
  subtitle?: unknown;
  categories?: unknown;
  points?: unknown;
  cards?: unknown;
}

interface RawCard {
  category?: unknown;
  points?: unknown;
  question?: unknown;
  answer?: unknown;
  image?: unknown;
  imageAlt?: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new QuizPackError(`"${field}" harus berupa teks yang tidak kosong.`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new QuizPackError(`"${field}" harus berupa teks.`);
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new QuizPackError('"categories" harus berupa array yang berisi minimal satu kategori.');
  }
  if (raw.length < MIN_CATEGORIES || raw.length > MAX_CATEGORIES) {
    throw new QuizPackError(
      `Jumlah kategori harus antara ${MIN_CATEGORIES} dan ${MAX_CATEGORIES}, bukan ${raw.length}.`,
    );
  }

  const seen = new Set<string>();
  return raw.map((entry, i) => {
    // A bare string is shorthand: the label doubles as the id.
    if (typeof entry === "string") {
      const label = requireString(entry, `categories[${i}]`);
      const id = slugify(label);
      if (seen.has(id)) {
        throw new QuizPackError(`Kategori "${label}" muncul lebih dari sekali.`);
      }
      seen.add(id);
      return { id, label };
    }

    if (!isObject(entry)) {
      throw new QuizPackError(
        `categories[${i}] harus berupa teks atau objek { "id", "label" }.`,
      );
    }

    const label = requireString(entry.label, `categories[${i}].label`);
    const id = entry.id === undefined ? slugify(label) : requireString(entry.id, `categories[${i}].id`);
    if (seen.has(id)) {
      throw new QuizPackError(`Kategori dengan id "${id}" muncul lebih dari sekali.`);
    }
    seen.add(id);
    return { id, label };
  });
}

function parsePoints(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new QuizPackError('"points" harus berupa array angka, misalnya [1, 3, 5, 10].');
  }
  if (raw.length < MIN_POINT_TIERS || raw.length > MAX_POINT_TIERS) {
    throw new QuizPackError(
      `Jumlah tingkat poin harus antara ${MIN_POINT_TIERS} dan ${MAX_POINT_TIERS}, bukan ${raw.length}.`,
    );
  }

  const points = raw.map((p, i) => {
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || !Number.isInteger(p)) {
      throw new QuizPackError(`points[${i}] harus berupa bilangan bulat positif.`);
    }
    return p;
  });

  if (new Set(points).size !== points.length) {
    throw new QuizPackError('Nilai di "points" tidak boleh ada yang kembar.');
  }

  return points;
}

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "kategori"
  );
}

function parseCards(
  raw: unknown,
  categories: Category[],
  points: number[],
): JeopardyCard[] {
  if (!Array.isArray(raw)) {
    throw new QuizPackError('"cards" harus berupa array.');
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const pointSet = new Set(points);
  const seen = new Set<string>();
  const cards: JeopardyCard[] = [];

  raw.forEach((entry, i) => {
    if (!isObject(entry)) {
      throw new QuizPackError(`cards[${i}] harus berupa objek.`);
    }
    const card = entry as RawCard;

    const category = requireString(card.category, `cards[${i}].category`);
    if (!categoryIds.has(category)) {
      throw new QuizPackError(
        `cards[${i}].category "${category}" tidak ada di daftar "categories".`,
      );
    }

    if (typeof card.points !== "number" || !pointSet.has(card.points)) {
      throw new QuizPackError(
        `cards[${i}].points (${String(card.points)}) harus salah satu dari [${points.join(", ")}].`,
      );
    }

    const key = `${category}::${card.points}`;
    if (seen.has(key)) {
      throw new QuizPackError(
        `Ada dua kartu untuk kategori "${category}" dengan ${card.points} poin. Setiap kombinasi hanya boleh sekali.`,
      );
    }
    seen.add(key);

    const image = optionalString(card.image, `cards[${i}].image`);
    const imageAlt = optionalString(card.imageAlt, `cards[${i}].imageAlt`);
    if (image && !imageAlt) {
      throw new QuizPackError(
        `cards[${i}] punya "image" tetapi tidak punya "imageAlt". Teks alternatif wajib diisi.`,
      );
    }

    cards.push({
      id: `${category}-${card.points}`,
      category,
      points: card.points,
      question: requireString(card.question, `cards[${i}].question`),
      answer: requireString(card.answer, `cards[${i}].answer`),
      ...(image ? { image, imageAlt } : {}),
      opened: false,
      awardedTeamId: null,
    });
  });

  // Every cell of the grid must be filled, or the board would have holes.
  const missing: string[] = [];
  for (const category of categories) {
    for (const p of points) {
      if (!seen.has(`${category.id}::${p}`)) {
        missing.push(`${category.label} / ${p} poin`);
      }
    }
  }
  if (missing.length > 0) {
    throw new QuizPackError(
      `Kartu berikut belum ada: ${missing.join("; ")}. Setiap kategori butuh satu kartu untuk tiap nilai poin.`,
    );
  }

  return cards;
}

export function parseQuizPack(raw: unknown): QuizPack {
  if (!isObject(raw)) {
    throw new QuizPackError("File soal harus berisi satu objek JSON.");
  }
  const pack = raw as RawPack;

  const categories = parseCategories(pack.categories);
  const points = parsePoints(pack.points);

  return {
    title: requireString(pack.title, "title"),
    subtitle: optionalString(pack.subtitle, "subtitle"),
    categories,
    points,
    cards: parseCards(pack.cards, categories, points),
  };
}

/** Fresh, unplayed copies of the pack's cards. */
export function freshCards(pack: QuizPack): JeopardyCard[] {
  return pack.cards.map((card) => ({
    ...card,
    opened: false,
    awardedTeamId: null,
  }));
}
