import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const pathways = read("../src/lib/educationPathways.ts");
const onboarding = read("../src/components/StudentOnboarding.tsx");
const editor = read("../src/components/StudentProfileEditor.tsx");
const app = read("../src/App.tsx");

test("the shared pathway catalog matches Eswatini's school and higher-education stages", () => {
  for (const stage of ["Primary", "Secondary High", "High School", "Matric", "Tertiary"]) {
    assert.match(pathways, new RegExp('value: "' + stage + '"'));
  }
  assert.match(pathways, /Grades 0–7/);
  assert.match(pathways, /Forms 1–3/);
  assert.match(pathways, /Forms 4–5/);
  assert.match(pathways, /Form 6/);
  assert.match(pathways, /University/);
  assert.match(pathways, /College/);
  assert.match(pathways, /Technical \/ TVET/);
});

test("grade choices are constrained by the selected pathway", () => {
  assert.ok(pathways.includes('if (value === "Primary")'));
  assert.ok(pathways.includes('"Form 1", "Form 2", "Form 3"'));
  assert.ok(pathways.includes('"Form 4", "Form 5"'));
  assert.ok(pathways.includes('"Form 6", "Lower Sixth", "Upper Sixth"'));
  assert.ok(pathways.includes('"Year 1"'));
});
test("student onboarding asks learners to select a real stage and offers tertiary qualification details", () => {
  assert.match(onboarding, /Education stage/);
  assert.match(onboarding, /EDUCATION_PATHWAYS\.map/);
  assert.match(onboarding, /Qualification level/);
  assert.match(onboarding, /INSTITUTION_TYPES\.map/);
  assert.match(onboarding, /QUALIFICATION_LEVELS\.map/);
  assert.doesNotMatch(onboarding, /value="Secondary High" disabled/);
  assert.match(onboarding, /Choose your education stage/);
});

test("student profile editing persists the selected pathway through the academic profile RPC", () => {
  assert.match(editor, /update_studyspace_learner_academic_profile/);
  assert.match(editor, /p_education_level: draft\.level/);
  assert.match(editor, /p_institution_type:/);
  assert.match(editor, /p_qualification_level:/);
  assert.doesNotMatch(editor, /p_education_level: "Secondary High"/);
  assert.doesNotMatch(editor, /value="Secondary High" disabled/);
});

test("student cloud profile restoration and setup checks recognize all stages", () => {
  assert.match(app, /EDUCATION_LEVEL_VALUES\.includes/);
  assert.match(app, /education_level,institution_type,qualification_level/);
  assert.match(app, /update_studyspace_learner_academic_profile/);
  assert.match(app, /p_education_level: profileToSave\.level/);
  assert.doesNotMatch(app, /p_education_level: "Secondary High"/);
});
