import Dexie, { type EntityTable } from "dexie";

export type PlannerTask = {
  id: number;
  title: string;
  subject: string;
  due: string;
  minutes: number;
  priority: "High" | "Medium" | "Low";
  done: boolean;
};

class PlannerDatabase extends Dexie {
  tasks!: EntityTable<PlannerTask, "id">;

  constructor() {
    super("studyspace-local");
    this.version(1).stores({
      tasks: "id, subject, due, priority, done"
    });
  }
}

export const plannerDb = new PlannerDatabase();
