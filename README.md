# Student Academic Planner

An offline-first academic planner for students from primary school through university.

## Product principles

- **Local-first privacy:** student records stay on the device by default.
- **Offline capable:** the app shell and core features are designed to work offline after the first load.
- **Flexible academics:** support custom subjects, topics, academic periods, assessments and study preferences.
- **Explainable planning:** urgent assessments receive priority without silently deleting displaced study tasks.
- **Accessible by design:** responsive layouts, readable contrast, keyboard support and reduced-motion support.
- **No paid AI dependency:** Release 1 planning is deterministic and rules-based.

## Technology

- React + TypeScript + Vite
- Dexie / IndexedDB for structured local records
- vite-plugin-pwa for installability and offline app-shell caching
- Lucide icons
- Static hosting; no backend required for the first release

## Development

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Current status

**Foundation stage.** The first responsive dashboard and task interactions are in place. Persistence, real planner logic, onboarding, and data export/import are still being built. Dashboard chart and summary figures are illustrative, not calculated academic results.

## Privacy and data safety

Do not enter real student information into prototype builds. Before release, verify local persistence, backup/restore validation, storage migrations and explicit data deletion. Clearing browser data may erase local records, so backup/restore is a required release feature.

## Design direction

Dark navy glassmorphism, translucent layered panels, restrained 3D depth, soft elevation, cool blue highlights and mint progress indicators. Visual effects must not compromise readability or offline operation.
