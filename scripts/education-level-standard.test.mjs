import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const onboarding = read("../src/components/StudentOnboarding.tsx");
const editor = read("../src/components/StudentProfileEditor.tsx");

test("new learner onboarding exposes only Secondary High", () => {
  assert.match(onboarding, /level: "Secondary High"/);
  assert.match(onboarding, /const levels = \["Secondary High"\]/);
  assert.match(onboarding, /value="Secondary High" disabled/);
  assert.doesNotMatch(onboarding, /const levels = \[[^\]]*(Primary school|Secondary school|College|University|Other)/);
  assert.doesNotMatch(onboarding, /profile\.level === "University"|profile\.level === "College"/);
});

test("profile editing cannot restore or save an old education level", () => {
  assert.match(editor, /const LEVELS = \["Secondary High"\]/);
  assert.match(editor, /p_education_level: "Secondary High"/);
  assert.match(editor, /level: "Secondary High"/);
  assert.match(editor, /value="Secondary High" disabled/);
});
