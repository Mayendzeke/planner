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


test("the educational-use notice fades and collapses without covering chat history", () => {
  assert.match(mia, /learningNoticeVisible/);
  assert.match(mia, /learningNoticeFading/);
  assert.match(mia, /setLearningNoticeFading\(true\),\s*4200/);
  assert.match(mia, /mia-learning-only-notice/);
  assert.match(styles, /\.mia-learning-only-notice\.is-fading\s*\{[^}]*max-height:\s*0/s);
});

test("learning actions remain available after a student opens a conversation", () => {
  assert.match(mia, /messages\.length > 0 && <nav className="mia-quick-actions"/);
  for (const action of ["Understand a topic", "Homework help", "Exam revision", "Practice questions", "My study materials", "Plan my study week", "Create flashcards", "Make revision notes", "Language practice", "Improve my writing", "Coding & ICT help"]) {
    assert.ok(mia.includes(action), "Missing student action: " + action);
  }
  assert.match(mia, /sendMessage\(option\.prompt\)/);
});

test("the student chat client no longer displays an artificial rolling daily allowance", () => {
  assert.doesNotMatch(mia, /remainingDailyRequests|usage_status|requests remaining|rolling 24-hour limit/);
});
