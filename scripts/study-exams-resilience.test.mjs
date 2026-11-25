import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const app = read("src/App.tsx");
const page = read("src/components/StudyExamsPage.tsx");
const weekly = read("src/components/WeeklyTest.tsx");
const assigned = read("src/components/AssignedAssessments.tsx");
const homework = read("src/components/SchoolHomeworkHelp.tsx");
const styles = read("src/components/StudyExamsPage.css");
const backend = read("supabase/functions/mia-assistant/index.ts");
const provider = read("supabase/functions/mia-assistant/provider.ts");

test("Study & Exams is isolated behind a recovery boundary", () => {
  assert.match(app, /StudyExamsErrorBoundary><StudyExamsPage subjects=\{subjects\}\/>/);
  assert.match(page, /componentDidCatch/);
  assert.match(page, /getDerivedStateFromError/);
  assert.match(page, /Try again/);
  assert.match(page, /Reload StudySpace/);
});

test("Assessment workspace separates practice, teacher assignments and school help", () => {
  for (const tab of ['"practice"', '"assigned"', '"help"']) assert.ok(page.includes(tab), "Missing assessment tab: " + tab);
  assert.match(page, /role="tablist"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /<WeeklyTest subjects=\{subjects\} \/>/);
  assert.match(page, /<AssignedAssessments assignmentType="non_practice" \/>/);
  assert.match(page, /<SchoolHomeworkHelp \/>/);
});

test("Teacher assignments are mounted once, not duplicated inside the practice panel", () => {
  assert.doesNotMatch(weekly, /AssignedAssessments/);
  assert.match(page, /activeTab === "assigned" && <AssignedAssessments assignmentType="non_practice" \/>/);
  assert.match(page, /<AssignedAssessments assignmentType="practice" refreshKey=\{practiceRefreshKey\} \/>/);
  assert.match(assigned, /refreshInFlight/);
  assert.match(assigned, /hasLoadedOnce/);
  assert.match(assigned, /Try again/);
});

test("Teacher homework loading failures are converted into a visible error state", () => {
  assert.match(homework, /catch\(reason\)/);
  assert.match(homework, /finally\{setLoading\(false\);?\}/);
  assert.match(homework, /role="alert"/);
});

test("Assessment tabs provide single-tab-stop keyboard navigation", () => {
  assert.match(page, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(page, /ArrowRight/);
  assert.match(page, /ArrowLeft/);
  assert.match(page, /ArrowDown/);
  assert.match(page, /ArrowUp/);
  assert.match(page, /event\.key === "Home"/);
  assert.match(page, /event\.key === "End"/);
  assert.match(page, /\.focus\(\)/);
});

test("Assessment workspace provides responsive, keyboard-visible tab controls", () => {
  assert.match(styles, /\.study-exams-tab:focus-visible/);
  assert.match(styles, /@media\(max-width:620px\)/);
  assert.match(styles, /grid-template-columns:1fr/);
});


test("MIΛ topic tests support all five question formats for every registered subject", () => {
  for (const format of ["multiple_choice", "true_false", "fill_blank", "word_puzzle", "matching"]) {
    assert.ok(backend.includes(format), "Missing generated question format: " + format);
  }
  assert.ok(backend.includes("Core concepts and key principles across the registered subject"));
  assert.ok(backend.includes("assessment questions on the requested subject and topic"));
  assert.ok(weekly.includes("item.question_type"));
  assert.ok(weekly.includes('mode === "True or false" ? ["True", "False"]'));
  assert.ok(weekly.includes('question.mode === "Word puzzle"'));
});

test("Every enrolled subject can request a weekly test or examination from MIΛ", () => {
  assert.ok(weekly.includes("Full subject review — weekly test"));
  assert.ok(weekly.includes("Full subject review — examination paper"));
  assert.ok(weekly.includes("generateTopicTest(requestedTopic?: string)"));
  assert.ok(weekly.includes("const activePool = generatedQuestions.length ? generatedQuestions"));
});

test("Completed practice tests offer same-test retakes and a new-topic path", () => {
  assert.ok(weekly.includes("Retake same test"));
  assert.ok(weekly.includes("Try another topic"));
  assert.ok(weekly.includes("setGeneratedQuestions([])"));
});

test("MIΛ structured test generation has enough output capacity for a complete mixed paper", () => {
  assert.ok(provider.includes("Math.min(6000"));
  assert.ok(backend.includes("maxTokens: 5200"));
});
