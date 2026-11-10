# Supabase deployment notes

- Do not commit project keys, service-role keys, peppers, or database passwords.
- Keep `enrol-learner` deployed with JWT verification disabled because it is a public sign-up endpoint. It independently enforces the exact configured `APP_ORIGIN`, server-side rate limits, capacity, age, terms, and guardian-verification checks.
- Deploy the function with `supabase functions deploy enrol-learner --no-verify-jwt`.
- `PUBLIC_ENROLMENT_ENABLED` and `INVITE_ENROLMENT_ENABLED` default to enabled in the function; set the corresponding Supabase Edge Function secret to the literal `false` to pause either route.
- The public registration completion RPC is service-role-only. Never grant it to `anon`, `authenticated`, or `PUBLIC`.
- The database enforces the current 100-learner registration cap. Raising the cap requires a separately reviewed capacity migration.
