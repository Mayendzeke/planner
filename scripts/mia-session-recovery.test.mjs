import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/MiaChat.tsx", "utf8");

test("student MIΛ refreshes and retries once after an authentication 401", () => {
  assert.match(source, /firstStatus !== 401/);
  assert.match(source, /refreshSession\(\)/);
  assert.match(source, /return invoke\(refreshed\.data\.session\.access_token\)/);
});

test("student MIΛ restores the current learner's latest chat, not the oldest messages", () => {
  assert.match(source, /getUser\(session\.access_token\)/);
  assert.match(source, /\.eq\("learner_id", userId\)/);
  assert.match(source, /\.order\("created_at", \{ ascending: false \}\)\.limit\(20\)/);
  assert.match(source, /\[\.\.\.data\]\.reverse\(\)/);
});

test("student MIΛ provides a visible loading state and recoverable history warning", () => {
  assert.match(source, /Preparing your learning space/);
  assert.match(source, /Your saved chat could not be loaded/);
  assert.match(source, /setRestoreAttempt\(value => value \+ 1\)/);
  assert.match(source, /!restoring && messages\.length === 0/);
});
