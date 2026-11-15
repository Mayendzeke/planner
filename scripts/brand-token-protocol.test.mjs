import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("Student app uses the shared StudySpace typography tokens", () => {
  assert.match(css, /--font-body:'DM Sans'/);
  assert.match(css, /--font-display:'Manrope'/);
  assert.match(css, /font-family:var\(--font-body\)/);
});

test("dark and light themes use the StudySpace purple and teal palette", () => {
  assert.match(css, /--brand-primary:#a99afb/);
  assert.match(css, /--brand-primary-strong:#8f83e8/);
  assert.match(css, /--brand-secondary:#70d7b6/);
  assert.match(css, /--brand-primary:#7164d8/);
  assert.match(css, /--brand-primary-strong:#5d51c3/);
  assert.match(css, /--brand-secondary:#26866e/);
});
