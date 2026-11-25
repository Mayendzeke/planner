import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("subject workload preferences sync to and from the shared database", () => {
  const cloudSync = readFileSync("src/lib/cloudSync.ts", "utf8");
  assert.match(cloudSync, /difficulty_level: local\.difficultyLevel \|\| "moderate"/);
  assert.match(cloudSync, /subject_type: local\.subjectType \|\| "mixed"/);
  assert.match(cloudSync, /credit_hours: local\.creditHours \?\? 1/);
  assert.match(cloudSync, /weekly_minutes_target: local\.weeklyMinutesTarget \?\? 60/);
  assert.match(cloudSync, /difficultyLevel: String\(remote\.difficulty_level \|\| "moderate"\)/);
  assert.match(cloudSync, /subjectType: String\(remote\.subject_type \|\| "mixed"\)/);
});

test("Study & Exams opens on the programme and prepares assessments automatically", () => {
  const programme = readFileSync("src/components/AssessmentProgramme.tsx", "utf8");
  const examsPage = readFileSync("src/components/StudyExamsPage.tsx", "utf8");
  assert.match(examsPage, /useState<AssessmentTab>\("programme"\)/);
  assert.match(programme, /question_count:Number\(questionCount\)/);
  assert.match(programme, /setQuestionCount\(String\(preferences\.question_count\|\|10\)\)/);
  assert.match(programme, /for\(let batch=0;batch<12;batch\+\+\)/);
  assert.doesNotMatch(programme, /Prepare next batch/i);
});

test("programme displays weekly, monthly and quarterly assessment periods", () => {
  const programme = readFileSync("src/components/AssessmentProgramme.tsx", "utf8");
  assert.match(programme, /Monthly comprehensive tests/);
  assert.match(programme, /Quarterly examinations/);
  assert.match(programme, /data\.hasMore/);
  assert.match(programme, /assessment_schedule_runs/);
});


test("learner can request a persistent practice test and see its saved status", () => {
  const builder = readFileSync("src/components/PracticeRequestBuilder.tsx", "utf8");
  const exams = readFileSync("src/components/StudyExamsPage.tsx", "utf8");
  const assignments = readFileSync("src/components/AssignedAssessments.tsx", "utf8");
  assert.match(builder, /action:\s*"request_practice"/);
  assert.match(builder, /learner_practice_requests/);
  assert.match(builder, /questionCount:\s*Number\(questionCount\)/);
  assert.match(builder, /difficulty/);
  assert.match(exams, /PracticeRequestBuilder/);
  assert.match(exams, /assignmentType="practice"/);
  assert.match(assignments, /assignment_type/);
});

test("uploaded and teacher-assigned resources can trigger private study-pack preparation", () => {
  const library = readFileSync("src/components/StudentLibrary.tsx", "utf8");
  const cloudSync = readFileSync("src/lib/cloudSync.ts", "utf8");
  const preview = readFileSync("src/lib/studyMaterialPreview.ts", "utf8");
  assert.match(library, /learner_study_packs/);
  assert.match(cloudSync, /functions\.invoke\("study-material-engine"/);
  assert.match(cloudSync, /sourceType:"teacher_resource"/);
  assert.match(cloudSync, /prepareAssignedTeacherStudyPacks/);
  assert.match(preview, /pdfPreview/);
  assert.match(preview, /studyMaterialText/);
});
