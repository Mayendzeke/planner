import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const access = read("../src/components/StudentAccess.tsx");
const edge = read("../supabase/functions/enrol-learner/index.ts");
const migration = read("../supabase/migrations/20261110151719_studyspace_public_self_service_enrolment.sql");
const deployment = read("../.github/workflows/deploy.yml");

test("public sign-up does not ask learners for an issued Student ID or PIN", () => {
  assert.match(access, /publicEnrolmentEnabled \? \{\} : \{ studentId: studentId\.trim\(\)\.toUpperCase\(\), pin \}/);
  assert.match(access, /mode === "signin" \|\| \(mode === "enrol" && !publicEnrolmentEnabled\)/);
  assert.match(access, /!publicEnrolmentEnabled && <label>One-time enrolment PIN/);
  assert.match(access, /No invitation or Student ID is needed/);
});

test("the server creates and returns a unique Student ID", () => {
  assert.match(edge, /crypto\.getRandomValues\(new Uint8Array\(8\)\)/);
  assert.match(edge, /async function generateStudentId/);
  assert.match(edge, /complete_public_studyspace_enrolment/);
  assert.match(access, /const registeredStudentId = typeof data\.studentId === "string"/);
  assert.match(access, /studentId: registeredStudentId/);
  assert.match(access, /body: \{ action: "issue_invite", studentId: registeredStudentId, password \}/);
});

test("public enrolment preserves age, capacity, rate-limit and adult terms controls", () => {
  assert.match(edge, /learnerAge < 9/);
  assert.match(edge, /studyspace_enrolment_capacity_available/);
  assert.match(edge, /byId\.count \?\? 0\) >= 5/);
  assert.match(edge, /bySource\.count \?\? 0\) >= 12/);
  assert.match(edge, /termsVersion !== "2026-11-09-v8"/);
  assert.match(edge, /pending_guardian_verification/);
});

test("public RPC cannot be called by browser roles", () => {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path TO ''/);
  assert.match(migration, /revoke all on function public\.complete_public_studyspace_enrolment[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.complete_public_studyspace_enrolment[\s\S]+to service_role/i);
});

test("the deployed frontend build enables public registration", () => {
  assert.match(deployment, /VITE_STUDYSPACE_PUBLIC_ENROLMENT_ENABLED:\s*'true'/);
  assert.match(edge, /PUBLIC_ENROLMENT_ENABLED = Deno\.env\.get\("PUBLIC_ENROLMENT_ENABLED"\) !== "false"/);
  assert.match(edge, /origin !== allowedOrigin/);
});
