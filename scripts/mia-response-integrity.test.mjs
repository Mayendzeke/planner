import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const weekly = readFileSync(new URL("../src/components/WeeklyTest.tsx", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../supabase/functions/mia-assistant/index.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../supabase/functions/mia-assistant/provider.ts", import.meta.url), "utf8");

test("student topic-test requests have a matching MIΛ Edge Function action", () => {
  assert.match(weekly, /action: "generate_topic_test"/);
  assert.match(assistant, /body.action === "generate_topic_test"/);
  assert.match(assistant, /return json(200, {s*success: true, questions,/);
  assert.match(weekly, /Array.isArray(data?.questions)/);
});

test("subjects without a pre-authored local bank have a route to curriculum-aware topic tests", () => {
  assert.match(weekly, /A ready-made question bank is not available for {subject} yet/);
  assert.match(weekly, /Create a topic test with MIΛ/);
  assert.match(weekly, /onClick={()=>begin("Topic test")}/);
});

test("MIΛ responses are no longer silently cut to 1,200 or 4,000 characters", () => {
  assert.match(assistant, /maximum 6,000 characters/);
  assert.match(assistant, /result.reply = String(result.reply).trim()/);
  assert.doesNotMatch(assistant, /result.reply = String(result.reply).slice(0,s*1200)/);
  assert.doesNotMatch(assistant, /reply.slice(0,s*4000)/);
  assert.doesNotMatch(assistant, /clean.slice(0,s*4000)/);
  assert.match(assistant, /maxTokens: action === "chat" ? 2800 : 2400/);
});

test("MIΛ provider detects token-limited responses and tries the configured backup", () => {
  assert.match(provider, /completion?.finish_reason === "length"/);
  assert.match(provider, /automatic backup will be tried/);
  assert.match(provider, /[GEMMA_MODEL, SECONDARY_MODEL]/);
});
