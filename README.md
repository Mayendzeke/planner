# Studyspace — Student Academic Planner

Studyspace is an offline-first academic planner designed for learners from primary school through university. It is built as a local, single-device application: each browser profile has its own records, and no account or server is configured.

## Current capabilities

- Create, edit, complete and delete study tasks, assignments, exams, reading and other work.
- Add and remove custom subjects, choose subject colours, and link tasks to subjects.
- Set deadlines, estimated minutes, priority and notes; search tasks and filter open, overdue and completed work.
- Review dashboard totals, subject completion rates and study time calculated from records entered in the app.
- Explicitly log study sessions and set a weekly study-time goal.
- Switch between dark and light glass-inspired themes.
- Export a JSON backup and validate/restore a compatible backup.
- Delete all local records with a confirmation.
- Install as a PWA and cache the application shell for offline use after a successful first load.

## Privacy and data safety

- Subject, task and study-session records are stored in the browser's IndexedDB database on the current device.
- The application has no sign-in, cloud sync, analytics service or remote database.
- Records are not automatically shared between students, devices or browsers.
- Clearing site/browser storage, uninstalling the browser, or losing the device can erase records. Export backups regularly and keep backup files private.
- A backup contains the records you entered. Anyone with that file may be able to read its contents.
- The app does not provide multi-device synchronisation, account recovery, notifications or a background study timer in this release.

## Technology

- React + TypeScript + Vite
- Dexie / IndexedDB with a versioned schema migration
- vite-plugin-pwa / Workbox
- Lucide icons
- Static hosting; no backend required

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
npm run typecheck
npm run build
npm run preview
```

## GitHub Pages

The Vite base path is configured for the repository path `/planner/`. The Pages deployment workflow builds `dist` and deploys it when Pages is enabled for the repository. A successful workflow run is required before treating the site as ready.

On GitHub Free, GitHub Pages requires the repository to be public. A public repository exposes source files, commit history, documentation and workflow definitions. Keep secrets, personal student records and backup files out of the repository.

## Release verification checklist

- [ ] GitHub Actions typecheck and production build pass.
- [ ] Test add/edit/complete/delete for tasks and add/delete for subjects.
- [ ] Test deadlines in the device's local timezone, search and all planner filters.
- [ ] Test study-session logging and progress totals.
- [ ] Test JSON export and valid/invalid restore, including cancellation.
- [ ] Test dark/light themes and small-screen layout.
- [ ] Test first load, refresh, installation and offline relaunch on target browsers.
- [ ] Confirm no credentials, personal data or private files are present in the repository or commit history before changing visibility.

Studyspace is a personal local planner, not a central school management system. Each student must use their own browser/device profile. Cloud sync and administrator/student accounts are not included.
