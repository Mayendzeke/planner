# Supabase deployment notes

- Do not commit project keys, service-role keys, peppers, or database passwords.
- Keep `enrol-learner` deployed with JWT verification disabled because it is a public sign-up endpoint. It independently enforces the exact configured `APP_ORIGIN`, server-side rate limits, capacity, age, terms, and guardian-verification checks.
- Deploy the function with `supabase functions deploy enrol-learner --no-verify-jwt`.
- `PUBLIC_ENROLMENT_ENABLED` and `INVITE_ENROLMENT_ENABLED` default to enabled in the function; set the corresponding Supabase Edge Function secret to the literal `false` to pause either route.
- The public registration completion RPC is service-role-only. Never grant it to `anon`, `authenticated`, or `PUBLIC`.
- The database enforces the current 100-learner registration cap. Raising the cap requires a separately reviewed capacity migration.

## Learner account recovery and MIΛ

- Keep `manage-learner-account` deployed with JWT verification enabled. Its administrator-only `reset_password` action rotates the learner's Auth password and sets `app_metadata.must_change_password = true`. The generated temporary password is returned once to Monitor for private delivery.
- Keep `change-student-password` deployed with JWT verification enabled. It accepts only an authenticated active learner session, validates the new password, updates the password, clears the temporary-password flag, and records an audit event. Never disable JWT verification for this function.
- The Student App reads `app_metadata.must_change_password` from the authenticated session and blocks entry to the workspace until the learner sets a private password through `change-student-password`.
- Keep `mia-assistant` deployed with its JWT verification setting as currently configured. Its `generate_topic_test` action must validate the requested subject against the authenticated learner's registered subjects and use the server-side profile, curriculum, learning memory and recent assessment outcomes. Uploaded reference notes are optional and treated as untrusted academic source material.
- Deploy the MIΛ function with its companion `provider.ts` file. Provider credentials remain server-side Supabase secrets and must never be committed to Git.
