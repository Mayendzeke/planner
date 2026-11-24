import test from "node:test";
import assert from "node:assert/strict";
import { buildBalancedWeeklySchedule, workloadFor } from "../src/lib/assessmentScheduler.js";

const slots = [
  { id: "mon-1", day: "Monday", start: "16:00", end: "18:00" },
  { id: "tue-1", day: "Tuesday", start: "16:00", end: "18:00" },
  { id: "wed-1", day: "Wednesday", start: "16:00", end: "18:00" },
  { id: "thu-1", day: "Thursday", start: "16:00", end: "18:00" },
  { id: "fri-1", day: "Friday", start: "16:00", end: "18:00" },
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
  assert.ok(result.conflicts.every(item => item.reason === "no_available_slot"));
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
