import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guardian = readFileSync("src/components/GuardianConsentPage.tsx", "utf8");
const terms = readFileSync("src/components/TermsAndConditions.tsx", "utf8");

test("guardian consent submits the same version displayed in the current terms", () => {
  assert.match(terms, /export const TERMS_VERSION = ["']2026-\d{2}-\d{2}-v\d+["']/);
  assert.match(
    guardian,
    /import\s+TermsAndConditions,\s*\{\s*TERMS_VERSION,\s*type TermsAcceptanceRole\s*\}\s+from\s+["']\.\/TermsAndConditions["']/,
    "GuardianConsentPage must import the authoritative TERMS_VERSION export.",
  );
  assert.doesNotMatch(
    guardian,
    /const\s+TERMS_VERSION\s*=/,
    "GuardianConsentPage must not keep a separate, stale terms-version constant.",
  );
  assert.match(guardian, /termsVersion:\s*TERMS_VERSION/);
});
