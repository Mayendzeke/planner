import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const hub = read("src/components/LabLearningHub.tsx");
const subjectLabs = read("src/components/SubjectLabs.tsx");
const databaseMigration = read("supabase/migrations/20261115192917_studyspace_complete_lab_learning_ecosystem.sql");
const edge = read("supabase/functions/lab-learning-engine/index.ts");
const style = read("src/components/LabLearningHub.css");

test("the shared learning hub is mounted in every eligible subject Lab", () => {
  assert.match(subjectLabs, /import LabLearningHub from "\.\/LabLearningHub"/);
  assert.match(subjectLabs, /<LabLearningHub/);
  assert.match(subjectLabs, /subjectOptions=\{\[\.\.\.activeLab\.subjects, \.\.\.activeLab\.modules\]\}/);
  assert.match(subjectLabs, /generalScience/);
  assert.match(subjectLabs, /function classifySubject/);
});

test("Lab generator offers a broad reusable material library", () => {
  for (const type of ["revision_notes", "flashcards", "practice_quiz", "worked_examples", "study_guide", "glossary", "concept_map", "case_study", "lab_report", "formula_sheet", "study_plan", "question_bank"]) {
    assert.ok(hub.includes(type), "Missing material type: " + type);
  }
  for (const field of ["subjectName", "topic", "difficulty", "questionCount", "durationMinutes", "sourceNotes"]) {
    assert.ok(hub.includes(field), "Missing generation control: " + field);
  }
  assert.match(hub, /functions\.invoke\("lab-learning-engine"/);
  assert.match(hub, /My Lab Library/);
  assert.match(hub, /downloadMaterial/);
  assert.match(hub, /toggleFavourite/);
});

test("practice engine supports autosave, navigation, timed sessions and detailed marking", () => {
  for (const feature of ["multiple_choice", "true_false", "short_answer", "fill_blank", "persistAttempt", "updateAnswer", "remainingSeconds", "onFlag", "autoSubmitted", "explanation", "personal best"]) {
    assert.ok(hub.toLowerCase().includes(feature.toLowerCase()), "Missing practice capability: " + feature);
  }
  assert.match(hub, /status: "in_progress"/);
  assert.match(hub, /status: "submitted"/);
  assert.match(hub, /Submit and mark/);
  assert.match(hub, /Exam simulation/);
  assert.match(hub, /onExam/);
  assert.match(hub, /Review each explanation/);
});

test("retakes are separate, link to source attempts and include incorrect-only and fresh variants", () => {
  for (const mode of ["full_retake", "incorrect_only", "fresh_variant"]) assert.ok(hub.includes(mode));
  assert.match(hub, /retake_of: sourceAttempt\?\.id/);
  assert.match(hub, /Retake full set/);
  assert.match(hub, /Retry incorrect only/);
  assert.match(hub, /Generate fresh variant/);
  assert.ok(!hub.includes('from("exercise_attempts")'), "Generated Lab practice must not write official assessment attempts.");
});

test("progress insights are private to Lab practice and expose weak topics", () => {
  assert.match(hub, /buildWeakTopics/);
  assert.match(hub, /Topics to revisit/);
  assert.match(hub, /Official assessment grades remain elsewhere/);
});

test("Lab records have learner ownership, RLS and explicit authenticated grants", () => {
  for (const table of ["lab_generated_materials", "lab_practice_attempts"]) {
    assert.ok(databaseMigration.includes("create table if not exists public." + table));
    assert.ok(databaseMigration.includes("alter table public." + table + " enable row level security"));
    assert.ok(databaseMigration.includes(table + "_owner_manage"));
  }
  assert.match(databaseMigration, /learner_id = \(select auth\.uid\(\)\)/);
  assert.match(databaseMigration, /is_active_studyspace_learner\(\)/);
  assert.match(databaseMigration, /revoke all privileges on table public\.lab_generated_materials from anon, public/i);
  assert.match(databaseMigration, /revoke all privileges on table public\.lab_practice_attempts from anon, public/i);
  assert.match(databaseMigration, /grant select, insert, update, delete on public\.lab_generated_materials to authenticated/i);
  assert.match(databaseMigration, /grant select, insert, update, delete on public\.lab_practice_attempts to authenticated/i);
});

test("server generation checks learner access and validates structured AI output", () => {
  for (const contract of ["auth.getUser", "account_status", "date_of_birth", "terms_version", "trial_expires_at", "subscription_expires_at", "student_subjects", "resource_assignments", "exercise_assignments", "is_published", "lab_material_generation", "safeQuestions", "correctAnswer", "explanation"]) {
    assert.ok(edge.includes(contract), "Missing server-side guard: " + contract);
  }
  assert.match(edge, /age<9/);
  assert.match(edge, /recent\?\?0\)>=12/);
  assert.match(edge, /requiredJsonKeys/);
});

test("Lab workspace is responsive and respects reduced-motion preferences", () => {
  assert.match(style, /@media\(max-width:620px\)/);
  assert.match(style, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(style, /lab-hub-question-nav/);
});
