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

// ---------- My own operations ----------

/** Where each status goes next. Typing it as Record<TaskStatus, TaskStatus> means
 *  that if a new status is ever added to the union, tsc errors here until its
 *  next step is written, so no status can be forgotten. */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in-progress",
  "in-progress": "done",
  done: "done",
};

/** Moves one task a step forward: todo → in-progress → done. A done task stays done. */
export function advanceTask(tasks: Task[], id: number): Task[] {
  return tasks.map((task): Task =>
    task.id === id ? { ...task, status: NEXT_STATUS[task.status] } : task,
  );
}

/** Returns a new list where the task with this id has a new title. */
export function renameTask(tasks: Task[], id: number, title: string): Task[] {
  return tasks.map((task): Task => (task.id === id ? { ...task, title } : task));
}

/** Returns a new list without the task with this id. */
export function deleteTask(tasks: Task[], id: number): Task[] {
  return tasks.filter((task) => task.id !== id);
}

/** Counts the tasks in every status at once, for example { todo: 2, "in-progress": 1, done: 3 }.
 *  The return type has a key for every TaskStatus, so the counts can never miss one. */
export function countByStatus(tasks: Task[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, "in-progress": 0, done: 0 };
  for (const task of tasks) {
    counts[task.status] += 1;
  }
  return counts;
}

// ---------- Type-safety checks ----------
// I tried to break the model on purpose. Each line below made `tsc` fail with
// the error shown under it, which proves the types are tight. They stay
// commented out so the project compiles with zero errors.
//
// const noStatus: Task = { id: 1, title: "Buy milk" };
//   error TS2741: Property 'status' is missing in type '{ id: number; title: string; }' but required in type 'Task'.
//
// const stringId: Task = { id: "3", title: "Buy milk", status: "todo" };
//   error TS2322: Type 'string' is not assignable to type 'number'.
//
// filterByStatus([], "finished");
//   error TS2345: Argument of type '"finished"' is not assignable to parameter of type 'TaskStatus'.
//
// const badStatus: Task = { id: 4, title: "Read", status: "doing" };
//   error TS2322: Type '"doing"' is not assignable to type 'TaskStatus'.
