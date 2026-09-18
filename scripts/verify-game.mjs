/**
 * End-to-end verification of the interaction rules that define this game
 * (PRD §4.2) — the ones unit tests cannot reach because they live in the DOM:
 *
 *   single click  -> open question
 *   double click  -> reveal answer
 *   click outside -> closes ONLY after the answer is revealed
 *
 * Everything is derived from questions.json, so this keeps working whatever
 * pack is loaded.
 *
 * Usage: npm run dev, then `npm run verify` in another terminal.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const APP_URL = process.env.VERIFY_URL || "http://localhost:4321/";
const SHOTS = process.argv[2] || null;
const results = [];
let failed = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

// ---------- LOAD THE PACK ----------
const pack = JSON.parse(
  readFileSync(new URL("../src/content/questions.json", import.meta.url), "utf8"),
);

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const categories = pack.categories.map((c) =>
  typeof c === "string" ? { id: slug(c), label: c } : { id: c.id ?? slug(c.label), label: c.label },
);
const points = pack.points;
const totalCards = categories.length * points.length;

const firstCat = categories[0];
const lastCat = categories[categories.length - 1];
// Pick a mid tier for the mouse path and the dearest for the keyboard path.
const midPoints = points[Math.min(1, points.length - 1)];
const topPoints = points[points.length - 1];

const cardOf = (categoryId, value) =>
  pack.cards.find((c) => c.category === categoryId && c.points === value);

const midCard = cardOf(firstCat.id, midPoints);
const topCard = cardOf(lastCat.id, topPoints);

if (!midCard || !topCard) {
  console.error("Pack is missing the cards this script drives; check questions.json.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(APP_URL, { waitUntil: "networkidle" });

// ---------- HOME ----------
await page.waitForSelector(`text=${pack.title}`);
check("home renders the pack title", await page.isVisible(`text=${pack.title}`));
if (pack.subtitle) {
  check("home renders the subtitle", await page.isVisible(`text=${pack.subtitle}`));
}

const count = () => page.textContent("output");
check("default team count is 2", (await count()).trim() === "2");

const minus = page.getByRole("button", { name: "Kurangi jumlah tim" });
const plus = page.getByRole("button", { name: "Tambah jumlah tim" });
check("minus disabled at minimum", await minus.isDisabled());

for (let i = 0; i < 12 && !(await plus.isDisabled()); i++) await plus.click();
check("clamps at max 10", (await count()).trim() === "10");
check("plus disabled at maximum", await plus.isDisabled());

for (let i = 0; i < 7; i++) await minus.click();
check("stepper returns to 3", (await count()).trim() === "3");
await shot(page, "01-home");

await page.getByRole("button", { name: "Mulai" }).click();
await page.waitForSelector(`text=${firstCat.label}`);

// ---------- BOARD ----------
check(
  `board has ${totalCards} cards`,
  (await page.locator("main button").count()) === totalCards,
);
check("every category heading is shown",
  (await Promise.all(categories.map((c) => page.isVisible(`text=${c.label}`)))).every(Boolean),
);
check("score indicator visible", await page.isVisible("text=Tim 1"));
check("three teams listed", await page.isVisible("text=Tim 3"));
check("Selesai button present", await page.isVisible("button:has-text('Selesai')"));
check(
  "whole board fits the viewport",
  await page.evaluate(
    () => document.documentElement.scrollHeight <= window.innerHeight + 2,
  ),
);
await shot(page, "02-board");

// ---------- QUESTION ----------
const midLabel = new RegExp(`^${firstCat.label}, ${midPoints} poin$`);
await page.getByRole("button", { name: midLabel }).click();
await page.waitForSelector('[role="dialog"]');
check("single click opens question", await page.isVisible('[role="dialog"]'));
check("point badge shows", await page.isVisible(`text=${midPoints} Poin`));
check("question text shown", await page.isVisible(`text=${midCard.question}`));

// The answer must be ABSENT from the DOM, not merely hidden (PRD §11) —
// otherwise players could read it via Inspect Element or Ctrl+F.
check(
  "answer absent from DOM before reveal",
  !(await page.evaluate((t) => document.body.innerHTML.includes(t), midCard.answer)),
);
await shot(page, "03-question");

// Outside click and Escape must both be inert here (PRD §10.1, §13.1).
await page.mouse.click(30, 450);
await page.waitForTimeout(400);
check("outside click ignored on question", await page.isVisible('[role="dialog"]'));
check("still on question face", await page.isVisible(`text=${midPoints} Poin`));

await page.keyboard.press("Escape");
await page.waitForTimeout(400);
check("Escape ignored on question", await page.isVisible('[role="dialog"]'));

// ---------- ANSWER ----------
await page.locator('[role="dialog"]').dblclick({ position: { x: 200, y: 60 } });
await page.waitForTimeout(1000);
check("double click reveals answer", await page.isVisible("text=Jawaban"));
check("answer text now present", await page.isVisible(`text=${midCard.answer}`));
check("score dropdown appears", await page.isVisible("#score-assignment"));
check(
  "dropdown defaults to nobody",
  (await page.locator("#score-assignment").inputValue()) === "__nobody__",
);

// A real card turns all the way over. Swinging out to 90° and back would
// still show the answer, so assert the rotation actually landed at 180°.
const flipped = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"] > div');
  const m = new DOMMatrixReadOnly(getComputedStyle(panel).transform);
  // rotateY(180°) mirrors the X axis: m11 goes to -1.
  return Math.round(m.m11);
});
check("card rotates a full 180°", flipped === -1, `m11=${flipped}`);
await shot(page, "04-answer");

/** Reads the score span itself, ignoring the transient delta badge. */
const scoreOf = (name) =>
  page.evaluate((n) => {
    const row = [...document.querySelectorAll("li")].find(
      (l) => l.querySelector("span")?.textContent.trim() === n,
    );
    return row?.querySelector("span.tabular-nums")?.textContent.trim() ?? null;
  }, name);

await page.selectOption("#score-assignment", "team-1");
await page.waitForTimeout(300);
check("preview awards Tim 1", (await scoreOf("Tim 1")) === String(midPoints));

// Changing the pick must MOVE the points, not duplicate them (PRD §12.3).
await page.selectOption("#score-assignment", "team-2");
await page.waitForTimeout(900);
check("changing pick moves points off Tim 1", (await scoreOf("Tim 1")) === "0");
check("changing pick gives points to Tim 2", (await scoreOf("Tim 2")) === String(midPoints));

await page.mouse.click(30, 450);
await page.waitForTimeout(500);
check("outside click closes after reveal", !(await page.isVisible('[role="dialog"]')));
check(
  "played card is marked",
  (await page.locator("main button", { hasText: "✓" }).count()) === 1,
);
check(
  "card stays in the grid",
  (await page.locator("main button").count()) === totalCards,
);
await shot(page, "05-after-close");

// ---------- REOPEN TO CORRECT AN AWARD ----------
const playedTile = page.getByRole("button", {
  name: new RegExp(`${firstCat.label}, ${midPoints} poin, sudah dijawab`),
});
check("played card is still clickable", (await playedTile.count()) === 1);

await playedTile.click();
await page.waitForSelector('[role="dialog"]');
check("reopen goes straight to the answer", await page.isVisible("#score-assignment"));
check("correction is labelled", await page.isVisible("text=Perbaiki Poin"));
check(
  "previous award is preselected",
  (await page.locator("#score-assignment").inputValue()) === "team-2",
);
check(
  "points are not doubled while reopened",
  (await scoreOf("Tim 2")) === String(midPoints),
);
await shot(page, "05b-correction");

// Move the award to Tim 1 and confirm the points follow.
await page.selectOption("#score-assignment", "team-1");
await page.waitForTimeout(900);
await page.mouse.click(30, 450);
await page.waitForTimeout(500);
check("correction closes", !(await page.isVisible('[role="dialog"]')));
check("corrected award moves to Tim 1", (await scoreOf("Tim 1")) === String(midPoints));
check("corrected award leaves Tim 2", (await scoreOf("Tim 2")) === "0");

// Put it back so the finish-state expectations below still hold.
await playedTile.click();
await page.waitForSelector('[role="dialog"]');
await page.selectOption("#score-assignment", "__nobody__");
await page.waitForTimeout(600);
await page.mouse.click(30, 450);
await page.waitForTimeout(500);
check("award can be cleared entirely", (await scoreOf("Tim 1")) === "0");

// ---------- KEYBOARD PATH ----------
// Anchored so it matches only the unplayed card, never the longer
// "…, sudah dijawab" label of one already answered.
const topLabel = new RegExp(`^${lastCat.label}, ${topPoints} poin$`);
await page.getByRole("button", { name: topLabel }).focus();
await page.keyboard.press("Enter");
await page.waitForSelector('[role="dialog"]');
check("Enter opens card from board", await page.isVisible('[role="dialog"]'));

await page.keyboard.press("Enter");
await page.waitForTimeout(1000);
check("Enter reveals answer", await page.isVisible("#score-assignment"));

await page.selectOption("#score-assignment", "team-3");
await page.waitForTimeout(200);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("Escape closes on answer state", !(await page.isVisible('[role="dialog"]')));
check("keyboard award landed on Tim 3", (await scoreOf("Tim 3")) === String(topPoints));

// ---------- A FULL BOARD DOES NOT END THE GAME ----------
const finishBtn = page.getByRole("button", { name: "Selesai" });

/** Reads the finish button's background, to tell dormant from lit. */
const finishBg = () =>
  finishBtn.evaluate((el) => getComputedStyle(el).backgroundColor);

const dormantBg = await finishBg();

// Play out every card that is still untouched.
const remaining = await page
  .locator("main button")
  .filter({ hasNotText: "✓" })
  .count();

for (let i = 0; i < remaining; i++) {
  const tile = page.locator("main button").filter({ hasNotText: "✓" }).first();
  if ((await tile.count()) === 0) break;
  await tile.click();
  await page.waitForSelector('[role="dialog"]');
  await page.locator('[role="dialog"]').dblclick({ position: { x: 200, y: 60 } });
  await page.waitForTimeout(850);
  await page.mouse.click(30, 450);
  await page.waitForTimeout(450);
}

check(
  "every card is played",
  (await page.locator("main button", { hasText: "✓" }).count()) === totalCards,
);
check(
  "a full board does NOT end the game on its own",
  await page.isVisible("button:has-text('Selesai')"),
);
check("results screen has not appeared", !(await page.isVisible("text=Final Ranking")));

const litBg = await finishBg();
check("Selesai lights up when the board is done", litBg !== dormantBg, `${dormantBg} -> ${litBg}`);
// The design system's primary is #1B2A63.
check("Selesai uses the primary colour", litBg === "rgb(27, 42, 99)", litBg);
await shot(page, "05c-board-complete");

// A card can still be corrected after the board is full.
const anyPlayed = page.locator("main button", { hasText: "✓" }).first();
await anyPlayed.click();
await page.waitForSelector('[role="dialog"]');
check("cards stay correctable on a full board", await page.isVisible("#score-assignment"));
await page.selectOption("#score-assignment", "team-3");
await page.waitForTimeout(500);
await page.mouse.click(30, 450);
await page.waitForTimeout(450);
check("still playing after that correction", !(await page.isVisible("text=Final Ranking")));

// ---------- FINISH ----------
await finishBtn.click();
await page.waitForSelector("text=Final Ranking");
check("Selesai ends the game", await page.isVisible("text=Final Ranking"));
check("winner treatment shown", await page.isVisible("text=Winner"));
check("podium labels the unit", (await page.locator("text=Poin").count()) > 0);
await page.waitForTimeout(1200);
await shot(page, "06-results");

await page.getByRole("button", { name: "Main Lagi" }).click();
await page.waitForSelector(`text=${pack.title}`);
check("Main Lagi returns home", await page.isVisible("button:has-text('Mulai')"));

// ---------- ALL-ZERO EDGE CASE (PRD §15.3) ----------
await page.getByRole("button", { name: "Mulai" }).click();
await page.waitForSelector(`text=${firstCat.label}`);
await page.getByRole("button", { name: "Selesai" }).click();
await page.waitForTimeout(600);
check("all-zero shows no winner", await page.isVisible("text=Tidak ada pemenang"));
check("no trophy when nobody scored", !(await page.isVisible("text=Winner")));
await shot(page, "07-no-winner");

check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();

console.log(results.join("\n"));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed > 0 ? 1 : 0);
