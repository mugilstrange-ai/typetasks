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

// ---------- Core operations ----------
// Every function returns a NEW array and never changes the one it was given,
// so the UI in Part 2 can always tell when the list has changed.

/** The next free id: one more than the highest id in the list (1 for an empty list).
 *  Using the highest id (not the length) keeps ids unique even after a task is deleted. */
function nextId(tasks: Task[]): number {
  return tasks.reduce((highest, task) => Math.max(highest, task.id), 0) + 1;
}

/** Returns a new list with a new "todo" task added to the end. */
export function addTask(tasks: Task[], title: string): Task[] {
  const task: Task = { id: nextId(tasks), title, status: "todo" };
  return [...tasks, task];
}

/** Returns a new list where the task with this id is marked "done". */
export function completeTask(tasks: Task[], id: number): Task[] {
  return tasks.map((task): Task => (task.id === id ? { ...task, status: "done" } : task));
}

/** Returns only the tasks with this status. Because `status` is a TaskStatus,
 *  a value like "finished" is a compile error, not a silent empty list. */
export function filterByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status);
}
