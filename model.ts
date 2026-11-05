// TypeTasks: the typed data model (Part 1).
// Every part of the app is built on these types, so a task with the wrong
// shape or an unknown status can't even exist.

/** The only three states a task can ever be in. */
export type TaskStatus = "todo" | "in-progress" | "done";

/** The exact shape of one task. */
export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
}
