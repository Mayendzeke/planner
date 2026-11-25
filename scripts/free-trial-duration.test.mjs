import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const access = read("src/components/StudentAccess.tsx");
const subscription = read("src/components/StudentSubscription.tsx");
const enrolment = read("supabase/functions/enrol-learner/index.ts");
const terms = read("src/components/TermsAndConditions.tsx");
const app = read("src/App.tsx");

test("active enrolment returns a full seven-day free-trial duration", () => {
  assert.match(enrolment, /accountStatus: "active",[\s\S]*trialHours: 168/);
  assert.match(enrolment, /2026-11-24-v9/);
});

test("learners under 18 remain locked until guardian verification before trial activation", () => {
  assert.match(access, /7-day free trial/);
  assert.match(terms, /free trial lasts 7 consecutive days/);
  assert.match(terms, /under 18[\s\S]*trial does not begin until guardian verification is completed and approved/);
});

test("the student reminder is based on 24 hours before actual trial expiry", () => {
  assert.match(terms, /reminder is shown when 24 hours remain/);
  assert.match(app, /trialExpiry - 24 \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(app + terms + access, /trialStart \+ 6 \* 24|after 6 days|48 consecutive hours|48-hour free trial/i);
});

test("student subscription screen labels the free plan as seven days", () => {
  assert.match(subscription, /Free 7-day trial/);
  assert.doesNotMatch(access + terms + subscription, /48-hour free trial|48 consecutive hours/i);
});

test("paid subscription durations remain unchanged", () => {
  assert.match(subscription, /id: "weekly"[\s\S]*days: 7/);
  assert.match(subscription, /id: "two_weeks"[\s\S]*days: 14/);
  assert.match(subscription, /id: "monthly"[\s\S]*days: 28/);
});
