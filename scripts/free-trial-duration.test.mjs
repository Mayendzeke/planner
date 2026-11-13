import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const access = read("src/components/StudentAccess.tsx");
const subscription = read("src/components/StudentSubscription.tsx");

test("student sign-up clearly promises a seven-day free trial", () => {
  assert.match(access, /starts a 7-day free trial/);
  assert.doesNotMatch(access, /48-hour free trial/);
});

test("student subscription screen labels the free plan as seven days", () => {
  assert.match(subscription, /Free 7-day trial/);
  assert.doesNotMatch(subscription, /Free 48-hour trial/);
});

test("paid subscription options remain one week, two weeks and 28 days", () => {
  assert.match(subscription, /id: "weekly"[\s\S]*days: 7/);
  assert.match(subscription, /id: "two_weeks"[\s\S]*days: 14/);
  assert.match(subscription, /id: "monthly"[\s\S]*days: 28/);
});
