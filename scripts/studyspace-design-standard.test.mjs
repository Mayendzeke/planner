import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const mia = readFileSync(new URL("../src/components/MiaChat.tsx", import.meta.url), "utf8");
const fullscreen = readFileSync(new URL("../src/components/MiaFullscreen.css", import.meta.url), "utf8");
const brandStyles = readFileSync(new URL("../src/brand-home-link.css", import.meta.url), "utf8");
const standard = readFileSync(new URL("../STUDYSPACE_DEVELOPMENT_STANDARD.md", import.meta.url), "utf8");
const pullRequest = readFileSync(new URL("../.github/pull_request_template.md", import.meta.url), "utf8");

test("student Study Space brand control returns to the home page", () => {
  assert.match(app, /className="brand-home-link" onClick={() => { setPage("Overview"); setMobileMenu(false); }}/);
  assert.match(brandStyles, /.brand-home-link:focus-visible/);
});

test("student MIΛ opens as a full-screen workspace with an accessible navigation menu", () => {
  assert.match(app, /app-shell-mia/);
  assert.match(app, /onMenuClick={() => setMobileMenu(true)}/);
  assert.match(mia, /aria-label="Open StudySpace menu"/);
  assert.match(mia, /<Menu size={19}/>/);
  assert.match(fullscreen, /.app-shell-mia/);
  assert.match(fullscreen, /height: 100dvh/);
  assert.match(fullscreen, /.sidebar.sidebar-open/);
});

test("the uniform Study Space visual standard is part of the repository release process", () => {
  assert.match(standard, /Mandatory design and experience rule/);
  assert.match(standard, /Every development change, bug fix, refactor, integration, and upgrade/);
  assert.match(pullRequest, /follows `STUDYSPACE_DEVELOPMENT_STANDARD.md`/);
  assert.match(pullRequest, /Desktop and mobile layouts have been checked/);
  assert.match(pullRequest, /Light and dark themes have been checked/);
});
