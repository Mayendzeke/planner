import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studio = readFileSync("src/components/MathEquationStudio.tsx", "utf8");
const styles = readFileSync("src/components/MathEquationStudio.css", "utf8");
const labs = readFileSync("src/components/SubjectLabs.tsx", "utf8");

test("Math Equation Studio is mounted only inside the Mathematics Lab", () => {
  assert.match(labs, /import MathEquationStudio from "\.\/MathEquationStudio"/);
  assert.match(labs, /activeLab\.key === "maths" && <>\s*<MathsLab\/>\s*<MathEquationStudio studentId=/);
  assert.doesNotMatch(labs, /activeLab\.key === "science"[^\n]*MathEquationStudio/);
});

test("Equation Studio covers pathway-scoped equation families", () => {
  for (const pathway of ["Primary", "Secondary High", "High School", "Matric", "Tertiary"]) assert.ok(studio.includes(pathway));
  for (const topic of ["arithmetic", "linear", "quadratic", "systems", "rational", "radical", "exponential", "logarithmic", "absolute", "word-problems", "trigonometry"]) assert.ok(studio.includes('id: "' + topic + '"'), "Missing equation family " + topic);
  assert.match(studio, /pathways: \["Primary", "Secondary High", "High School", "Matric", "Tertiary"\]/);
});

test("Practice includes randomized variants, method selection, hints, worked steps and validation", () => {
  for (const item of ["New variant", "Choose an approach", "Get a hint", "Work through steps", "Check my answer", "quadratic formula", "extraneous roots", "Domain / restrictions"]) assert.ok(studio.toLowerCase().includes(item.toLowerCase()), "Missing feature " + item);
  assert.match(studio, /Math\.abs\(value - b\[index\]\) < 0\.011/);
  assert.match(studio, /localStorage\.setItem\(historyKey/);
});

test("Equation Studio is responsive and honours reduced motion", () => {
  assert.match(styles, /@media\(max-width:680px\)/);
  assert.match(styles, /@media\(max-width:420px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});

test("Practice difficulty changes scaffolding and keeps primary examples positive", () => {
  assert.ok(studio.includes('pathway === "Primary" ? randomInt(1, 10)'));
  assert.ok(studio.includes('difficulty === "challenge" ? -12'));
  assert.ok(studio.includes('setShowHint(nextDifficulty === "guided")'));
  assert.ok(studio.includes('disabled={difficulty === "challenge" && !checked}'));
});

test("Equation Studio attempts sync into shared learner progress and Monitor with offline retry", () => {
  assert.ok(studio.includes('from("lab_practice_attempts").upsert'));
  assert.ok(studio.includes('status: "submitted"'));
  assert.ok(studio.includes('mode: "practice"'));
  assert.ok(studio.includes("pendingHistoryKey"));
  assert.ok(studio.includes('material_snapshot->>title'));
  assert.ok(studio.includes("teacher's Monitor"));
});
test("Equation Studio follows the learner's saved academic pathway and isolates local history", () => {
  assert.ok(studio.includes('from("profiles").select("education_level")'));
  assert.ok(studio.includes('raw === "secondary high"'));
  assert.ok(studio.includes('matched === "Primary" ? "arithmetic"'));
  assert.ok(studio.includes('(studentId ?? "anonymous")'));
});
