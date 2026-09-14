/**
 * End-to-end verification of the interaction rules that define this game
 * (PRD §4.2) — the ones unit tests cannot reach because they live in the DOM:
 *
 *   single click  -> open question
 *   double click  -> reveal answer
 *   click outside -> closes ONLY after the answer is revealed
 *
 * Usage: npm run dev, then `npm run verify` in another terminal.
 */
import { chromium } from "playwright";

const URL = process.env.VERIFY_URL || "http://localhost:4321/";
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle" });

// ---------- HOME ----------
await page.waitForSelector("text=Bible Jeopardy");
check("home renders title", await page.isVisible("text=Bible Jeopardy"));

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
await page.waitForSelector("text=Perjanjian Lama");

// ---------- BOARD ----------
check(
  "board has 12 playable cards",
  (await page.locator("main button:not([aria-disabled])").count()) === 12,
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
await page.getByRole("button", { name: /Perjanjian Lama, 3 poin/ }).click();
await page.waitForSelector('[role="dialog"]');
check("single click opens question", await page.isVisible('[role="dialog"]'));
check("point badge shows", await page.isVisible("text=3 Poin"));

// The answer must be ABSENT from the DOM, not merely hidden (PRD §11) —
// otherwise players could read it via Inspect Element or Ctrl+F.
const answerText = "[Jawaban 3 poin — Perjanjian Lama]";
check(
  "answer absent from DOM before reveal",
  !(await page.evaluate((t) => document.body.innerHTML.includes(t), answerText)),
);
await shot(page, "03-question");

// Outside click and Escape must both be inert here (PRD §10.1, §13.1).
await page.mouse.click(30, 450);
await page.waitForTimeout(400);
check("outside click ignored on question", await page.isVisible('[role="dialog"]'));
check("still on question face", await page.isVisible("text=3 Poin"));

await page.keyboard.press("Escape");
await page.waitForTimeout(400);
check("Escape ignored on question", await page.isVisible('[role="dialog"]'));

// ---------- ANSWER ----------
await page.locator('[role="dialog"]').dblclick({ position: { x: 200, y: 60 } });
await page.waitForTimeout(900);
check("double click reveals answer", await page.isVisible("text=Jawaban"));
check("answer text now present", await page.isVisible(`text=${answerText}`));
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
check("preview awards Tim 1", (await scoreOf("Tim 1")) === "3");

// Changing the pick must MOVE the points, not duplicate them (PRD §12.3).
await page.selectOption("#score-assignment", "team-2");
await page.waitForTimeout(900);
check("changing pick moves points off Tim 1", (await scoreOf("Tim 1")) === "0");
check("changing pick gives points to Tim 2", (await scoreOf("Tim 2")) === "3");

await page.mouse.click(30, 450);
await page.waitForTimeout(500);
check("outside click closes after reveal", !(await page.isVisible('[role="dialog"]')));
check(
  "played card is marked",
  (await page.locator('main button[aria-disabled="true"]').count()) === 1,
);
check("card stays in the grid", (await page.locator("main button").count()) === 12);
await shot(page, "05-after-close");

// ---------- KEYBOARD PATH ----------
await page.getByRole("button", { name: /Tokoh Rasul, 5 poin/ }).focus();
await page.keyboard.press("Enter");
await page.waitForSelector('[role="dialog"]');
check("Enter opens card from board", await page.isVisible('[role="dialog"]'));

await page.keyboard.press("Enter");
await page.waitForTimeout(900);
check("Enter reveals answer", await page.isVisible("#score-assignment"));

await page.selectOption("#score-assignment", "team-3");
await page.waitForTimeout(200);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("Escape closes on answer state", !(await page.isVisible('[role="dialog"]')));
check("keyboard award landed on Tim 3", (await scoreOf("Tim 3")) === "5");

// ---------- FINISH ----------
await page.getByRole("button", { name: "Selesai" }).click();
await page.waitForSelector("text=Final Ranking");
check("Selesai ends the game early", await page.isVisible("text=Final Ranking"));
check("winner treatment shown", await page.isVisible("text=Winner"));

const winnerBlock = await page.textContent("section");
check(
  "Tim 3 is the winner",
  winnerBlock.includes("Tim 3") && winnerBlock.includes("5"),
);
await page.waitForTimeout(1200);
await shot(page, "06-results");

await page.getByRole("button", { name: "Main Lagi" }).click();
await page.waitForSelector("text=Uji pengetahuanmu");
check("Main Lagi returns home", await page.isVisible("text=Uji pengetahuanmu"));

// ---------- ALL-ZERO EDGE CASE (PRD §15.3) ----------
await page.getByRole("button", { name: "Mulai" }).click();
await page.waitForSelector("text=Perjanjian Lama");
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
