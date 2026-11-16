import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const practicals = readFileSync("src/components/AssignedLabPracticals.tsx", "utf8");
const subjectLabs = readFileSync("src/components/SubjectLabs.tsx", "utf8");

test("Student Labs loads only practicals assigned to the signed-in learner and eligible lab areas", () => {
  assert.ok(practicals.includes('from("lab_assignments")'));
  assert.ok(practicals.includes('.eq("learner_id", studentId)'));
  assert.ok(practicals.includes('.in("lab_area", areas)'));
  assert.ok(subjectLabs.includes("<AssignedLabPracticals"));
  assert.ok(subjectLabs.includes('activeLab.key === "maths" ? ["maths"]'));
  assert.ok(subjectLabs.includes('area !== "environment"'));
});

test("Learners submit a written reflection into the existing teacher-review notebook", () => {
  assert.ok(practicals.includes('from("student_lab_work").upsert'));
  assert.ok(practicals.includes('onConflict: "learner_id,lab_area,activity_key"'));
  assert.ok(practicals.includes('"assignment:" + active.id'));
  assert.ok(practicals.includes('status: "submitted"'));
  assert.ok(practicals.includes("text.length < 20"));
  assert.ok(practicals.includes("Your practical reflection has been submitted to your teacher."));
});

test("Student submission preserves teacher review metadata and can display feedback status", () => {
  assert.ok(practicals.includes("reviewed_at: null"));
  assert.ok(practicals.includes("reviewed_by: null"));
  assert.ok(practicals.includes("record?.reviewed_at"));
  assert.ok(practicals.includes("record?.feedback"));
});
