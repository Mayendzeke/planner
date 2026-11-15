import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/SubjectLabs.tsx", import.meta.url), "utf8");
const start = source.indexOf("function classifySubject(");
const end = source.indexOf("function classifyAssignedModule(", start);
const classifier = source.slice(start, end);

test("lab access is determined by the enrolled subject name, not its editable category", () => {
  assert.match(source, /classifySubject\(subject\.name\)/);
  assert.doesNotMatch(source, /classifySubject\(subject\.name,\s*subject\.category/);
  assert.doesNotMatch(classifier, /const combined = value \+ " " \+ category/);
});

test("computing and social-science subjects do not unlock the experimental Science Lab", () => {
  for (const excluded of ["computer science", "data science", "information science", "library science", "social science", "political science"]) {
    assert.ok(classifier.toLowerCase().includes(excluded), "explicitly exclude " + excluded);
  }
});

test("assigned modules are scoped to the signed-in learner and released assessments", () => {
  assert.match(source, /resource_assignments[\s\S]*?eq\("learner_id", studentId\)/);
  assert.match(source, /exercise_assignments[\s\S]*?eq\("learner_id", studentId\)/);
  assert.match(source, /available_at/);
  assert.match(source, /eq\("is_published", true\)/);
});
