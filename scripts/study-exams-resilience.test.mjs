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
  assert.match(page, /<AssignedAssessments \/>/);
  assert.match(page, /<SchoolHomeworkHelp \/>/);
});

test("Teacher assignments are mounted once, not duplicated inside the practice panel", () => {
  assert.doesNotMatch(weekly, /AssignedAssessments/);
  assert.match(page, /activeTab === "assigned" && <AssignedAssessments \/>/);
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
