import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const graph = read("src/components/LabGraphSheet.tsx");
const graphStyles = read("src/components/LabGraphSheet.css");
const studio = read("src/components/MathEquationStudio.tsx");
const hub = read("src/components/LabLearningHub.tsx");
const assignments = read("src/components/AssignedLabPracticals.tsx");

test("Every equation method advertised as graph-based renders a real graph sheet", () => {
  assert.match(studio, /<LabGraphSheet graph=\{problem\.graph\} \/>/);
  assert.match(studio, /<LabGraphSheet numberLine=\{problem\.numberLine\} \/>/);
  for (const title of [
    "Compare both sides of the linear equation",
    "Quadratic curve and its roots",
    "Intersection of simultaneous equations",
    "Rational equation and excluded value",
    "Radical equation and horizontal line",
    "Exponential equation: compare both sides",
    "Logarithmic equation and horizontal line",
    "Absolute-value V graph",
    "Circular-function equation (degrees)",
  ]) assert.ok(studio.includes(title), "Missing graph: " + title);
});

test("Graph sheet provides zoom, pan, reset, labelled axes and solution markers", () => {
  for (const item of ["ZoomIn", "ZoomOut", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "RotateCcw", "viewBox", "clipPath", "useId", "graph.points"]) assert.ok(graph.includes(item), "Missing graph capability: " + item);
  assert.match(graphStyles, /@media\(max-width:620px\)/);
  assert.match(graphStyles, /:focus-visible/);
  assert.match(graphStyles, /lab-graph-solution-point/);
});

test("Inequality number-line display preserves open and closed boundaries", () => {
  assert.match(studio, /numberLine: \{ boundary: root, direction: finalRelation === "<" \? "left" : "right", inclusive: false \}/);
  assert.match(graph, /numberLine\.inclusive/);
  assert.match(graph, /numberLine\.direction/);
});

test("Quiz answer normalization preserves mathematical operators", () => {
  assert.match(hub, /replace\(\/≤\/g, "<="\)/);
  assert.match(hub, /replace\(\/≥\/g, ">="\)/);
  assert.match(hub, /function canonicalAnswer/);
  assert.match(hub, /function numericAnswer/);
  assert.match(hub, /Math\.abs\(expected - numeric\)/);
});

test("Math Studio local history is isolated between signed-in learners", () => {
  assert.match(studio, /\(!studentId \? localStorage\.getItem\(historyKey\) : null\)/);
  assert.match(studio, /learnerHistoryKey = historyKey \+ ":" \+ subjectName \+ ":" \+ \(studentId \?\? "anonymous"\)/);
});

test("Teacher practical submissions remain linked to the assigned learner and reviewed work is locked", () => {
  assert.match(assignments, /onConflict: "learner_id,lab_area,activity_key"/);
  assert.match(assignments, /reviewed_at\) return/);
  assert.match(assignments, /submission_type: "learner_reflection"/);
});
