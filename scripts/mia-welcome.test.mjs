import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mia = readFileSync("src/components/MiaChat.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

test("the student MIΛ greeting is temporary and stays out of chat history", () => {
  assert.match(mia, /useState<ChatMessage\[\]>\(\[\]\)/);
  assert.match(mia, /const welcomeText = createWelcome\(profile, subjects\);/);
  assert.match(mia, /mia-welcome-toast/);
  assert.match(mia, /setTimeout\(dismissWelcome,\s*4200\)/);
  assert.match(mia, /messages\.length === 0/);
  assert.doesNotMatch(mia, /id:\s*["']mia-welcome["']/);
  assert.doesNotMatch(mia, /setMessages\(\[createWelcome/);
});

test("the greeting fades away and respects reduced-motion preferences", () => {
  assert.match(styles, /\.mia-welcome-toast\.is-fading\s*\{[^}]*opacity:\s*0/s);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});
