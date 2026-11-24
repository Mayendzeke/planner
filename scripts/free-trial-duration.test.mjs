import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const access = read("src/components/StudentAccess.tsx");
const subscription = read("src/components/StudentSubscription.tsx");
const enrolment = read("supabase/functions/enrol-learner/index.ts");
const terms = read("src/components/TermsAndConditions.tsx");
const app = read("src/App.tsx");

test("active enrolment returns a 48-hour free-trial duration", () => {
  assert.match(enrolment, /accountStatus: "active",[\\s\\S]*trialHours: 48/);
});

test("learners under 18 remain locked until guardian verification before trial activation", () => {
  assert.match(access, /48-hour free trial/);
  assert.match(access, /under 18[\\s\\S]*trial does not begin until guardian verification is approved/);
  assert.match(terms, /free trial lasts 48 consecutive hours/);
  assert.match(terms, /under 18[\\s\\S]*trial does not begin until guardian verification is completed and approved/);
  assert.match(terms, /reminder is shown when 24 hours remain/);
  assert.match(enrolment, /2026-11-24-v9/);
});

test("student subscription and access screens use the 48-hour trial policy", () => {
  assert.match(subscription, /Free 48-hour trial/);
  assert.match(app, /Your 48-hour free trial has ended/);
  assert.match(app, /trialExpiry - 24 \\* 60 \\* 60 \\* 1000/);
  assert.doesNotMatch(access + terms + subscription + app, /7-day free trial|7 consecutive days|after 6 days/i);
});

test("paid subscription durations remain unchanged", () => {
  assert.match(subscription, /id: "weekly"[\\s\\S]*days: 7/);
  assert.match(subscription, /id: "two_weeks"[\\s\\S]*days: 14/);
  assert.match(subscription, /id: "monthly"[\\s\\S]*days: 28/);
});
