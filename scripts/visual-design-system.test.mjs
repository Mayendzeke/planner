import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("student experience keeps the premium glass design layer", () => {
  assert.match(css, /Study Space premium glass experience/);
  assert.match(css, /\.glass-panel/);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /--glass-depth/);
});

test("student interactions include depth, press feedback and reduced-motion support", () => {
  assert.match(css, /translateY\(-3px\).*perspective/s);
  assert.match(css, /:active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("student glass layer retains mobile and light-theme adaptations", () => {
  assert.match(css, /data-theme="light"/);
  assert.match(css, /max-width:\s*720px/);
});
