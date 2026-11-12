import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const edge = read("../supabase/functions/change-student-password/index.ts");
const security = read("../src/components/StudentAccountSecurity.tsx");

test("student password Edge Function extracts a normal Bearer token", () => {
  assert.ok(
    edge.includes("authorization.match(/^Bearer\\s+(.+)$/i)"),
    "the function must use a single whitespace escape in its Bearer matcher"
  );
  const matcher = /^Bearer\s+(.+)$/i;
  const token = "eyJhbGciOiJIUzI1NiJ9.test.signature";
  assert.equal(matcher.exec("Bearer " + token)?.[1], token);
  assert.equal(matcher.exec("bearer " + token)?.[1], token);
  assert.equal(matcher.exec("Bearer" + token)?.[1], undefined);
});

test("student password screen displays the server's actionable error response", () => {
  assert.ok(security.includes("context instanceof Response"));
  assert.ok(security.includes("payload.error"));
  assert.ok(security.includes("edgeFunctionError(invokeError"));
});
