import Dexie, { type EntityTable } from "dexie";

export type Subject = {
  id: number;
  name: string;
  color: string;
  createdAt: string;
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
};
export type StudySession = {
  id: number;
  subjectId: number | null;
  date: string;
  minutes: number;
  notes: string;
};

class PlannerDatabase extends Dexie {
  subjects!: EntityTable<Subject, "id">;
  tasks!: EntityTable<PlannerTask, "id">;
  sessions!: EntityTable<StudySession, "id">;

  constructor() {
    super("studyspace-local");
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
  }
}

export const plannerDb = new PlannerDatabase();
