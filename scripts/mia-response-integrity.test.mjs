import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const weekly = readFileSync(new URL("../src/components/WeeklyTest.tsx", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../supabase/functions/mia-assistant/index.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../supabase/functions/mia-assistant/provider.ts", import.meta.url), "utf8");

test("student topic-test requests have a matching MIΛ Edge Function action", () => {
  assert.ok(weekly.includes('action: "generate_topic_test"'));
  assert.ok(assistant.includes('if (action === "generate_topic_test")'));
  assert.ok(assistant.includes("success: true, questions,"));
  assert.ok(weekly.includes("data?.questions"));
});

test("subjects without a pre-authored local bank have a route to curriculum-aware topic tests", () => {
  assert.ok(weekly.includes("A ready-made question bank is not available for {subject} yet"));
  assert.ok(weekly.includes("Create a topic test with MIΛ"));
  assert.ok(weekly.includes('onClick={()=>begin("Topic test")}'));
});

test("MIΛ responses are no longer silently cut to 1,200 or 4,000 characters", () => {
  assert.ok(assistant.includes("up to 6,000 characters"));
  assert.ok(assistant.includes("result.reply = String(result.reply).trim()"));
  assert.ok(!assistant.includes("result.reply = String(result.reply).slice(0, 1200)"));
  assert.ok(!assistant.includes("reply.slice(0, 4000)"));
  assert.ok(!assistant.includes("clean.slice(0, 4000)"));
  assert.ok(assistant.includes('maxTokens: action === "chat" ? 2800 : 2400'));
});

test("MIΛ provider detects token-limited responses and tries the configured backup", () => {
  assert.ok(provider.includes('completion?.finish_reason === "length"'));
  assert.ok(provider.includes("automatic backup will be tried"));
  assert.ok(provider.includes("[GEMMA_MODEL, SECONDARY_MODEL]"));
});
