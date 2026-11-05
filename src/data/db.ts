import Dexie, { type EntityTable } from "dexie";

export type CloudSyncEntity = "subjects" | "tasks" | "sessions" | "academicPeriods" | "events" | "resources";
export type CloudTombstone = { entity: CloudSyncEntity; cloudId: string; deletedAt: string };
let activeOwnerId: string | null = null;
let cloudSyncPaused = false;

function tombstoneStorageKey() { return activeOwnerId ? "studyspace:user-" + activeOwnerId + ":cloud-deletions" : "studyspace:guest:cloud-deletions"; }
function recordTombstone(entity: CloudSyncEntity, cloudId: string) {
  try {
    const key = tombstoneStorageKey();
    const current = JSON.parse(localStorage.getItem(key) || "[]") as CloudTombstone[];
    if (!current.some(item => item.entity === entity && item.cloudId === cloudId)) current.push({ entity, cloudId, deletedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(current));
  } catch { /* The next full reconciliation still preserves all undeleted rows. */ }
}

export function readCloudTombstones(): CloudTombstone[] {
  try {
    const raw = JSON.parse(localStorage.getItem(tombstoneStorageKey()) || "[]");
    return Array.isArray(raw) ? raw.filter((item): item is CloudTombstone => item && typeof item.cloudId === "string" && ["subjects","tasks","sessions","academicPeriods","events","resources"].includes(item.entity)) : [];
  } catch { return []; }
}

export function clearCloudTombstones(completed: CloudTombstone[]) {
  if (!completed.length) return;
  const key = tombstoneStorageKey();
  const done = new Set(completed.map(item => item.entity + ":" + item.cloudId));
  try {
    const current = readCloudTombstones();
    localStorage.setItem(key, JSON.stringify(current.filter(item => !done.has(item.entity + ":" + item.cloudId))));
  } catch { /* Retain pending deletions for the next sync attempt. */ }
}

export async function withCloudSyncPaused<T>(work: () => Promise<T>): Promise<T> {
  cloudSyncPaused = true;
  try { return await work(); } finally { cloudSyncPaused = false; }
}

export type Subject = {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  code?: string;
  description?: string;
  category?: string;
  targetMark?: number;
  periodIds?: number[];
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};
export type PlannerTask = {
  id: number;
  title: string;
  subjectId: number | null;
  dueAt: string;
  minutes: number;
  priority: "High" | "Medium" | "Low";
  kind: "Study" | "Assignment" | "Exam" | "Reading" | "Other";
  notes: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};
export type StudySession = {
  id: number;
  subjectId: number | null;
  date: string;
  minutes: number;
  notes: string;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};
export type StudentResource = {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  file: Blob;
  createdAt: string;
  subjectId?: number;
  resourceType?: "Study notes" | "Revision notes";
  topic?: string;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  kind: "Test" | "School event" | "Personal" | "Other";
  notes: string;
  createdAt: string;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};

export type AcademicPeriod = {
  id: number;
  title: string;
  kind: "Term" | "Holiday" | "Examination" | "Other";
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
  cloudId?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
};

class PlannerDatabase extends Dexie {
  subjects!: EntityTable<Subject, "id">;
  tasks!: EntityTable<PlannerTask, "id">;
  sessions!: EntityTable<StudySession, "id">;
  academicPeriods!: EntityTable<AcademicPeriod, "id">;
  resources!: EntityTable<StudentResource, "id">;
  events!: EntityTable<CalendarEvent, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ tasks: "id, subject, due, priority, done" });
    this.version(2).stores({
      tasks: "id, subjectId, dueAt, priority, kind, done, createdAt",
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, date"
    }).upgrade(async (tx) => {
      const oldTasks = await tx.table("tasks").toArray();
      await tx.table("tasks").clear();
      for (const old of oldTasks) {
        await tx.table("tasks").put({
          id: Number(old.id) || Date.now() + Math.random(),
          title: String(old.title ?? "Untitled task"),
          subjectId: null,
          dueAt: "",
          minutes: Number(old.minutes) || 30,
          priority: ["High", "Medium", "Low"].includes(old.priority) ? old.priority : "Medium",
          kind: "Study",
          notes: "",
          done: Boolean(old.done),
          createdAt: new Date().toISOString(),
          completedAt: old.done ? new Date().toISOString() : null
        });
      }
    });
    this.version(3).stores({
      tasks: "id, subjectId, dueAt, priority, kind, done, createdAt",
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, date",
      academicPeriods: "id, kind, startDate, endDate"
    });
    this.version(4).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate" });
    this.version(5).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate", resources: "id, name, mimeType, createdAt" });
    this.version(6).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate", resources: "id, name, mimeType, createdAt", events: "id, date, kind, createdAt" });
    this.version(7).stores({
      tasks: "id, cloudId, subjectId, dueAt, priority, kind, done, createdAt",
      subjects: "id, cloudId, name, createdAt",
      sessions: "id, cloudId, subjectId, date",
      academicPeriods: "id, cloudId, kind, startDate, endDate",
      resources: "id, cloudId, name, mimeType, createdAt",
      events: "id, cloudId, date, kind, createdAt"
    });
    // Stamp every local change and retain deletion tombstones until the server
    // confirms them. Sync imports are paused so server timestamps stay intact.
    const entities: CloudSyncEntity[] = ["subjects", "tasks", "sessions", "academicPeriods", "events", "resources"];
    for (const entity of entities) {
      const table = this.table(entity) as any;
      table.hook("creating").subscribe((_key: unknown, obj: Record<string, unknown>) => {
        if (cloudSyncPaused) return;
        obj.cloudId = typeof obj.cloudId === "string" ? obj.cloudId : crypto.randomUUID();
        obj.localUpdatedAt = new Date().toISOString();
      });
      table.hook("updating").subscribe((changes: Record<string, unknown>, _key: unknown, obj: Record<string, unknown>) => {
        if (cloudSyncPaused) return;
        changes.cloudId = typeof obj.cloudId === "string" ? obj.cloudId : crypto.randomUUID();
        changes.localUpdatedAt = new Date().toISOString();
      });
      table.hook("deleting").subscribe((_key: unknown, obj: Record<string, unknown>) => {
        if (cloudSyncPaused || typeof obj.cloudId !== "string") return;
        recordTombstone(entity, obj.cloudId);
      });
    }
  }
}

let activeDatabase = new PlannerDatabase("studyspace-local-guest");

// Route all database operations through the current authenticated student's
// own IndexedDB database. This prevents shared-device accounts from reading
// one another's offline planner records.
export const plannerDb = new Proxy({} as PlannerDatabase, {
  get(_target, property) {
    const value = Reflect.get(activeDatabase, property, activeDatabase);
    return typeof value === "function" ? value.bind(activeDatabase) : value;
  },
  set(_target, property, value) {
    return Reflect.set(activeDatabase, property, value, activeDatabase);
  },
});

export function setPlannerDbUser(userId: string | null) {
  const normalized = userId && /^[a-zA-Z0-9_-]{1,128}$/.test(userId) ? userId : null;
  const nextName = normalized ? "studyspace-local-user-" + normalized : "studyspace-local-guest";
  if (activeOwnerId === normalized && activeDatabase.name === nextName) return;
  const previous = activeDatabase;
  activeOwnerId = normalized;
  activeDatabase = new PlannerDatabase(nextName);
  previous.close();
}
