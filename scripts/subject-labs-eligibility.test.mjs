import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/SubjectLabs.tsx", import.meta.url), "utf8");
const start = source.indexOf("function classifySubject(");
const end = source.indexOf("function classifyAssignedModule(", start);
const classifier = source.slice(start, end);
const scienceStart = source.indexOf("const scienceAliases:");
const scienceEnd = source.indexOf("const generalScience", scienceStart);
const scienceAreaBlock = source.slice(scienceStart, scienceEnd);
const scienceAreaPatterns = [...scienceAreaBlock.matchAll(/:\s*\/(.*?)\/i/g)].map(match => new RegExp(match[1], "i"));
const generalScienceSource = source.match(/const generalScience = \/(.*?)\/i/)?.[1] || "";
const generalSciencePattern = new RegExp(generalScienceSource, "i");

test("lab access is determined by the enrolled subject name, not its editable category", () => {
  assert.match(source, /classifySubject\(subject\.name\)/);
  assert.doesNotMatch(source, /classifySubject\(subject\.name,\s*subject\.category/);
  assert.doesNotMatch(classifier, /const combined = value \+ " " \+ category/);
});

test("Science Lab requires a recognised discipline or explicit general Science course", () => {
  assert.match(classifier, /const hasExperimentalScience = areas.length > 0 \|\| isGeneralScience/);
  assert.match(classifier, /key === "science" && !hasExperimentalScience/);
});

test("non-laboratory science-labelled subjects do not meet Science Lab eligibility", () => {
  for (const title of [
    "Computer Science", "Data Science", "Information Science", "Library Science",
    "Social Science", "Political Science", "Agricultural Science"
  ]) {
    assert.equal(scienceAreaPatterns.some(pattern => pattern.test(title)), false, title + " must not match an experimental science discipline");
    assert.equal(generalSciencePattern.test(title.trim().toLowerCase()), false, title + " must not match general Science");
  }
});

test("assigned modules are scoped to the signed-in learner and released assessments", () => {
  assert.match(source, /resource_assignments[\s\S]*?eq\("learner_id", studentId\)/);
  assert.match(source, /exercise_assignments[\s\S]*?eq\("learner_id", studentId\)/);
  assert.match(source, /available_at/);
  assert.match(source, /eq\("is_published", true\)/);
});
