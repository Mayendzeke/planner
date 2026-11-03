import Dexie, { type EntityTable } from "dexie";

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
export type StudentResource = {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  file: Blob;
  createdAt: string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  kind: "Test" | "School event" | "Personal" | "Other";
  notes: string;
  createdAt: string;
};

export type AcademicPeriod = {
  id: number;
  title: string;
  kind: "Term" | "Holiday" | "Examination" | "Other";
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
};

class PlannerDatabase extends Dexie {
  subjects!: EntityTable<Subject, "id">;
  tasks!: EntityTable<PlannerTask, "id">;
  sessions!: EntityTable<StudySession, "id">;
  academicPeriods!: EntityTable<AcademicPeriod, "id">;
  resources!: EntityTable<StudentResource, "id">;
  events!: EntityTable<CalendarEvent, "id">;

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
    this.version(3).stores({
      tasks: "id, subjectId, dueAt, priority, kind, done, createdAt",
      subjects: "id, name, createdAt",
      sessions: "id, subjectId, date",
      academicPeriods: "id, kind, startDate, endDate"
    });
    this.version(4).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate" });
    this.version(5).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate", resources: "id, name, mimeType, createdAt" });
    this.version(6).stores({ tasks: "id, subjectId, dueAt, priority, kind, done, createdAt", subjects: "id, name, createdAt", sessions: "id, subjectId, date", academicPeriods: "id, kind, startDate, endDate", resources: "id, name, mimeType, createdAt", events: "id, date, kind, createdAt" });
  }
}

export const plannerDb = new PlannerDatabase();
