import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBalancedWeeklySchedule, workloadFor } from "../src/lib/assessmentScheduler.js";

const slots = [
  { id: "mon-1", day: "Monday", start: "16:00", end: "20:00" },
  { id: "tue-1", day: "Tuesday", start: "16:00", end: "20:00" },
  { id: "wed-1", day: "Wednesday", start: "16:00", end: "20:00" },
  { id: "thu-1", day: "Thursday", start: "16:00", end: "20:00" },
  { id: "fri-1", day: "Friday", start: "16:00", end: "20:00" },
];

test("covers all registered subjects when weekday capacity is sufficient", () => {
  const subjects = Array.from({ length: 18 }, (_, index) => ({ id: index + 1, name: "Module " + (index + 1), difficulty: "moderate" }));
  const result = buildBalancedWeeklySchedule({ subjects, availableSlots: slots, dailyMinutesLimit: 240 });
  assert.equal(result.assignments.length, 18);
  assert.equal(result.conflicts.length, 0);
  assert.ok(result.assignments.every(item => item.questionCount === 10));
});

test("separates high-difficulty subjects across days where alternatives exist", () => {
  const subjects = [
    { id: "physics", name: "Physics", difficulty: "high", subject_type: "calculation" },
    { id: "statistics", name: "Statistics", difficulty: "high", subject_type: "calculation" },
    { id: "accounting", name: "Accounting", difficulty: "high", subject_type: "calculation" },
    { id: "communication", name: "Communication", difficulty: "low", subject_type: "essay" },
  ];
  const result = buildBalancedWeeklySchedule({ subjects, availableSlots: slots });
  const hardDays = result.assignments.filter(item => item.difficultyScore >= 4.5).map(item => item.day);
  assert.equal(new Set(hardDays).size, hardDays.length);
});

test("flags capacity conflicts instead of silently dropping subjects", () => {
  const result = buildBalancedWeeklySchedule({
    subjects: [{ id: 1, name: "Module A" }, { id: 2, name: "Module B" }],
    availableSlots: [{ day: "Monday", start: "16:00", end: "16:10" }],
  });
  assert.equal(result.assignments.length, 0);
  assert.equal(result.conflicts.length, 2);
  assert.ok(result.conflicts.every(item => item.reason === "insufficient_available_capacity"));
});

test("deduplicates duplicate subject records by id", () => {
  const result = buildBalancedWeeklySchedule({
    subjects: [{ id: "a", name: "A" }, { id: "a", name: "A duplicate" }],
    availableSlots: slots,
  });
  assert.equal(result.assignments.length, 1);
});

test("weak recent performance increases workload priority", () => {
  assert.ok(workloadFor({ difficulty: "moderate", recent_score: 35 }).workload >
    workloadFor({ difficulty: "moderate", recent_score: 90 }).workload);
});

test("reports days that exceed the student's daily workload target", () => {
  const subjects = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, name: "Module " + (index + 1), difficulty: "moderate" }));
  const result = buildBalancedWeeklySchedule({ subjects, availableSlots: slots, dailyMinutesLimit: 30 });
  assert.ok(result.conflicts.some(item => item.reason === "daily_workload_limit_exceeded"));
});

test("subject workload preferences sync to and from the shared database", () => {
  const cloudSync = readFileSync("src/lib/cloudSync.ts", "utf8");
  assert.match(cloudSync, /difficulty_level: local\.difficultyLevel \|\| "moderate"/);
  assert.match(cloudSync, /subject_type: local\.subjectType \|\| "mixed"/);
  assert.match(cloudSync, /credit_hours: local\.creditHours \?\? 1/);
  assert.match(cloudSync, /weekly_minutes_target: local\.weeklyMinutesTarget \?\? 60/);
  assert.match(cloudSync, /difficultyLevel: String\(remote\.difficulty_level \|\| "moderate"\)/);
  assert.match(cloudSync, /subjectType: String\(remote\.subject_type \|\| "mixed"\)/);
});

test("programme is the default Study & Exams view and assessment batches prepare automatically", () => {
  const programme = readFileSync("src/components/AssessmentProgramme.tsx", "utf8");
  const examsPage = readFileSync("src/components/StudyExamsPage.tsx", "utf8");
  assert.match(examsPage, /useState<AssessmentTab>\("programme"\)/);
  assert.match(programme, /question_count:Number\(questionCount\)/);
  assert.match(programme, /setQuestionCount\(String\(preferences\.question_count\|\|10\)\)/);
  assert.match(programme, /for\(let batch=0;batch<12;batch\+\+\)/);
  assert.doesNotMatch(programme, /Prepare next batch/i);
});
