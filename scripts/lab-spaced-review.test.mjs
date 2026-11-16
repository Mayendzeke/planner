import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hub = readFileSync("src/components/LabLearningHub.tsx", "utf8");
const style = readFileSync("src/components/LabLearningHub.css", "utf8");

test("Lab review schedule is derived from submitted attempts without changing official assessment records", () => {
  assert.match(hub, /function buildReviewQueue\(attempts: LabAttempt\[\]\)/);
  assert.match(hub, /attempt\.status === "submitted"/);
  assert.match(hub, /nextReviewAt/);
  assert.match(hub, /consecutiveStrong >= 3 \? 30 : score < 60 \? 1 : score < 75 \? 3 : score < 90 \? 7 : 14/);
  assert.doesNotMatch(hub, /from\("exercise_attempts"\)/);
});

test("Learners can open due reviews or create a focused refresh quiz", () => {
  assert.match(hub, /value:"review", label:"Review"/);
  assert.match(hub, /Your review schedule/);
  assert.match(hub, /Review now/);
  assert.match(hub, /Create review quiz/);
  assert.match(hub, /difficulty: item\.latest < 60 \? "foundation" : "mixed"/);
});

test("Review queue remains responsive on small screens", () => {
  assert.match(style, /\.lab-review-queue/);
  assert.match(style, /\.lab-review-status\.is-due/);
  assert.match(style, /@media\(max-width:620px\)\{\.lab-review-card/);
});
