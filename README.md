# Studyspace Student Planner

Studyspace is an offline-first academic planner for learners from primary school through university. It combines a local IndexedDB workspace with a shared Supabase account so a learner can continue working offline and synchronise their planner when connected.

## Student features

- Personal profile with institution, country, level, grade, curriculum and academic year.
- Subjects, targets, study tasks, due dates, priorities and notes.
- Academic periods, terms, exams, holidays and calendar events.
- Study-session logging, weekly goals, progress summaries and flashcard practice.
- Teacher-assigned resources stored in a private bucket and personal file storage.
- Teacher-assigned assessments: multiple choice, true/false, fill-in answers, matching and written responses.
- Secure server-side assessment marking, deadlines and teacher feedback for written answers.
- Light/dark appearance, responsive layout, installable PWA and offline application-shell caching.

## Data and synchronisation

- Dexie / IndexedDB is the local working cache.
- Supabase Auth identifies the learner; database records are scoped to that learner's Auth user ID.
- Planner records, goals, reminders, calendar data, practice progress and personal resources synchronise through Supabase.
- Local edits are retained for offline use and reconciled with cloud records on sync/reconnect.
- Deletion tombstones prevent previously deleted records from being restored by a later sync.
- Personal files and teacher resources use the private `studyspace-resources` Storage bucket with database-backed access policies.
- The browser database is not a substitute for a separate backup. Export and store backups securely.

Browser study reminders use local notifications. The browser must be open for the reminder check to run; this release does not promise background push notifications, SMS or notifications while the browser is closed.

## Shared backend

Both Studyspace applications use the same Supabase project:

- Project URL: `https://tibcoottzstnqkfpwabk.supabase.co`
- Backend and migration source: [Mayendzeke/studyspace-monitor](https://github.com/Mayendzeke/studyspace-monitor)
- Production setup and migration instructions: [SUPABASE_SETUP.md](https://github.com/Mayendzeke/studyspace-monitor/blob/main/SUPABASE_SETUP.md)

The student client uses only the public Supabase publishable key. Never add a secret/service-role key, database password, student password, enrolment PIN, personal file or other private learner data to this repository or its browser build.

## Technology

- React, TypeScript and Vite
- Dexie / IndexedDB
- Supabase Auth, PostgreSQL, Row Level Security and private Storage
- Supabase Edge Functions for privileged assessment operations
- vite-plugin-pwa / Workbox
- GitHub Pages

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
npm run typecheck
npm run build
npm run preview
```

Configure the public frontend environment values in GitHub Actions Variables (or a local `.env.local` file):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only public client values belong in the frontend. Never use a Supabase secret key in a `VITE_*` variable.

## Deployment

The app is published through GitHub Pages at [mayendzeke.github.io/planner](https://mayendzeke.github.io/planner/). A successful GitHub Actions build and Pages deployment is required before treating a source change as live.

## Release verification

- Confirm the latest GitHub Actions build and Pages deployment succeed.
- Verify sign-in and learner account isolation with the intended test accounts.
- Verify the same learner's workspace synchronises across two separate devices/browsers.
- Verify edits and deletions made offline reconcile correctly after reconnecting.
- Verify personal files and teacher-assigned resources remain private to the correct learner.
- Verify assessments respect release dates and deadlines, submit to the server, and record results.
- Verify written answers appear in the Monitor marking queue and teacher feedback returns to the learner.
- Test installation, first load, refresh and offline relaunch on target browsers.

The production build verifies TypeScript and frontend compilation. It does not, by itself, prove every live database policy, account, storage rule or multi-device workflow.
