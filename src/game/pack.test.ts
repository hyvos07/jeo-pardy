import { describe, expect, it } from "vitest";
import { parseQuizPack, QuizPackError } from "./pack";

/** A minimal 2x2 pack; helpers below bend it into each failure case. */
function validPack() {
  return {
    title: "Kuis Umum",
    subtitle: "Uji pengetahuanmu",
    categories: ["Sejarah", "Sains"],
    points: [1, 5],
    cards: [
      { category: "sejarah", points: 1, question: "Q1", answer: "A1" },
      { category: "sejarah", points: 5, question: "Q2", answer: "A2" },
      { category: "sains", points: 1, question: "Q3", answer: "A3" },
      { category: "sains", points: 5, question: "Q4", answer: "A4" },
    ],
  };
}

describe("valid packs", () => {
  it("parses a well-formed pack", () => {
    const pack = parseQuizPack(validPack());
    expect(pack.title).toBe("Kuis Umum");
    expect(pack.subtitle).toBe("Uji pengetahuanmu");
    expect(pack.categories).toEqual([
      { id: "sejarah", label: "Sejarah" },
      { id: "sains", label: "Sains" },
    ]);
    expect(pack.points).toEqual([1, 5]);
    expect(pack.cards).toHaveLength(4);
  });

  it("derives ids from category labels", () => {
    const raw = validPack();
    raw.categories = ["Tokoh Rasul", "Sains"];
    raw.cards = raw.cards.map((c) => ({
      ...c,
      category: c.category === "sejarah" ? "tokoh-rasul" : c.category,
    }));
    const pack = parseQuizPack(raw);
    expect(pack.categories[0]).toEqual({ id: "tokoh-rasul", label: "Tokoh Rasul" });
  });

  it("accepts explicit ids alongside labels", () => {
    const raw = validPack();
    raw.categories = [
      { id: "hist", label: "Sejarah Dunia" },
      { id: "sci", label: "Sains" },
    ] as never;
    raw.cards = [
      { category: "hist", points: 1, question: "Q", answer: "A" },
      { category: "hist", points: 5, question: "Q", answer: "A" },
      { category: "sci", points: 1, question: "Q", answer: "A" },
      { category: "sci", points: 5, question: "Q", answer: "A" },
    ];
    const pack = parseQuizPack(raw);
    expect(pack.categories.map((c) => c.id)).toEqual(["hist", "sci"]);
  });

  it("supports any board shape, not just 3x4", () => {
    const pack = parseQuizPack({
      title: "Satu Kolom",
      categories: ["Umum"],
      points: [2, 4, 6, 8, 10, 12],
      cards: [2, 4, 6, 8, 10, 12].map((points) => ({
        category: "umum",
        points,
        question: "Q",
        answer: "A",
      })),
    });
    expect(pack.categories).toHaveLength(1);
    expect(pack.cards).toHaveLength(6);
  });

  it("marks cards unplayed and unawarded", () => {
    const pack = parseQuizPack(validPack());
    expect(pack.cards.every((c) => !c.opened && c.awardedTeamId === null)).toBe(true);
  });

  it("treats subtitle as optional", () => {
    const raw = validPack();
    delete (raw as { subtitle?: unknown }).subtitle;
    expect(parseQuizPack(raw).subtitle).toBeUndefined();
  });

  it("keeps an image together with its alt text", () => {
    const raw = validPack();
    raw.cards[0] = {
      ...raw.cards[0]!,
      image: "/foto.jpg",
      imageAlt: "Sebuah foto",
    } as never;
    const card = parseQuizPack(raw).cards[0]!;
    expect(card.image).toBe("/foto.jpg");
    expect(card.imageAlt).toBe("Sebuah foto");
  });
});

describe("rejected packs", () => {
  const reject = (mutate: (raw: ReturnType<typeof validPack>) => void, match: RegExp) => {
    const raw = validPack();
    mutate(raw);
    expect(() => parseQuizPack(raw)).toThrow(QuizPackError);
    expect(() => parseQuizPack(raw)).toThrow(match);
  };

  it("rejects a missing title", () => {
    reject((r) => ((r as { title?: unknown }).title = ""), /title/);
  });

  it("rejects an empty category list", () => {
    reject((r) => (r.categories = []), /categories/);
  });

  it("rejects duplicate categories", () => {
    reject((r) => (r.categories = ["Sains", "Sains"]), /lebih dari sekali/);
  });

  it("rejects duplicate point tiers", () => {
    reject((r) => (r.points = [5, 5]), /kembar/);
  });

  it("rejects non-integer points", () => {
    reject((r) => (r.points = [1, 2.5]), /bilangan bulat positif/);
  });

  it("rejects a card pointing at an unknown category", () => {
    reject((r) => (r.cards[0]!.category = "tidak-ada"), /tidak ada di daftar/);
  });

  it("rejects a card with a point value outside the tiers", () => {
    reject((r) => (r.cards[0]!.points = 7), /harus salah satu dari/);
  });

  it("rejects two cards in the same slot", () => {
    reject((r) => (r.cards[1]!.points = 1), /hanya boleh sekali/);
  });

  it("rejects a board with a hole in it", () => {
    reject((r) => r.cards.pop(), /belum ada/);
  });

  it("rejects an empty question", () => {
    reject((r) => (r.cards[0]!.question = "   "), /question/);
  });

  it("rejects an image without alt text", () => {
    reject(
      (r) => ((r.cards[0] as { image?: string }).image = "/foto.jpg"),
      /imageAlt/,
    );
  });

  it("rejects too many categories", () => {
    reject(
      (r) => (r.categories = ["a", "b", "c", "d", "e", "f", "g"]),
      /Jumlah kategori/,
    );
  });

  it("rejects a non-object pack", () => {
    expect(() => parseQuizPack([])).toThrow(/objek JSON/);
    expect(() => parseQuizPack(null)).toThrow(/objek JSON/);
  });
});
