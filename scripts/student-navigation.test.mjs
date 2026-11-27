import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const mia = readFileSync(new URL("../src/components/MiaChat.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const miaStyles = readFileSync(new URL("../src/components/MiaFullscreen.css", import.meta.url), "utf8");

test("MIΛ provides a persistent return path to the student dashboard", () => {
  assert.match(app, /onExit=\{\(\) => \{ setPage\("Overview"\); setMobileMenu\(false\); \}\}/);
  assert.match(mia, /aria-label="Back to StudySpace home"/);
  assert.match(mia, /Back to StudySpace/);
  assert.match(miaStyles, /\.mia-exit-button/);
});

test("student sidebar navigation is grouped by learning task", () => {
  for (const label of ["START HERE", "LEARN", "ORGANISE", "CONNECT"]) {
    assert.ok(app.includes(label), "Missing navigation group: " + label);
  }
});

test("SiSwati language learning is available in the LEARN navigation group", () => {
  assert.match(app, /names: \["Learning Studio", "MIΛ", "Subjects", "Labs", "Study & Exams", "Study Materials & Resources", "Languages"\]/);
  assert.match(app, /label: "Learn"[\s\S]*?"Languages"\].includes\(page\)/);
  assert.match(app, /name: "Languages", icon: Languages/);
});

test("mobile quick navigation exposes core student destinations and More", () => {
  assert.match(app, /className="mobile-bottom-nav"/);
  for (const label of ["Home", "Learn", "Planner", "Tests", "MIΛ", "More"]) {
    assert.ok(app.includes('label: "' + label + '"') || app.includes("<span>" + label + "</span>"), "Missing mobile destination: " + label);
  }
  assert.match(styles, /\.mobile-bottom-nav[\s\S]*?grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test("MIΛ exit and mobile navigation controls remain accessible", () => {
  assert.match(mia, /title="Back to StudySpace"/);
  assert.match(app, /aria-controls="student-navigation-drawer"/);
  assert.match(app, /aria-label="Quick navigation"/);
});
