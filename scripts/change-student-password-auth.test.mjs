import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const edge = read("../supabase/functions/change-student-password/index.ts");
const security = read("../src/components/StudentAccountSecurity.tsx");

test("student password Edge Function extracts a normal Bearer token", () => {
  const match = edge.match(/authorization\\.match\\((\\/^Bearer.*?\\/i)\\)/);
  assert.ok(match, "the function must parse its Authorization header with an explicit Bearer matcher");
  const literal = match[1];
  const slash = literal.lastIndexOf("/");
  const matcher = new RegExp(literal.slice(1, slash), literal.slice(slash + 1));
  const token = "eyJhbGciOiJIUzI1NiJ9.test.signature";
  assert.equal(matcher.exec("Bearer " + token)?.[1], token);
  assert.equal(matcher.exec("bearer " + token)?.[1], token);
  assert.equal(matcher.exec("Bearer" + token)?.[1], undefined);
});

test("student password screen displays the server's actionable error response", () => {
  assert.match(security, /context instanceof Response/);
  assert.match(security, /payload\\.error/);
  assert.match(security, /edgeFunctionError\\(invokeError/);
});
