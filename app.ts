// TaskTrail UI (Part 2): connects the page to the typed model from Part 1.
// Every click calls a typed operation from model.ts and then re-renders.
// There is no `any` anywhere: DOM elements are cast to their exact element
// types, and anything that comes from outside (data-* attributes, saved JSON)
// is checked by a type guard before it is used.

import {
  addTask,
  advanceTask,
  completeTask,
  countByStatus,
  deleteTask,
  filterByStatus,
} from "./model.js";
import type { Task, TaskStatus } from "./model.js";

// ---------- Types for the UI ----------

/** What the filter chips can show: one status, or every task. */
type Filter = TaskStatus | "all";

/** The buttons on each task card. */
type Action = "advance" | "complete" | "delete";

const STATUSES: readonly TaskStatus[] = ["todo", "in-progress", "done"];
const ACTIONS: readonly Action[] = ["advance", "complete", "delete"];

/** Text for each status badge. Record<TaskStatus, ...> means tsc errors if a status is missing. */
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};

/** What the advance button says for each status (done tasks have no advance button). */
const ADVANCE_LABEL: Record<TaskStatus, string> = {
  todo: "Start ▸",
  "in-progress": "Finish ▸",
  done: "",
};

const EMPTY_TEXT: Record<Filter, string> = {
  all: "No tasks yet. Add your first one above!",
  todo: "Nothing waiting. Every task has been started.",
  "in-progress": "Nothing in progress right now.",
  done: "Nothing finished yet. Keep going!",
};

const STORAGE_KEY = "tasktrail.tasks.v1";

// ---------- Typed DOM access ----------

const form = document.getElementById("task-form") as HTMLFormElement;
const titleInput = document.getElementById("title") as HTMLInputElement;
const hint = document.getElementById("hint") as HTMLParagraphElement;
const filterBar = document.getElementById("filters") as HTMLElement;
const list = document.getElementById("task-list") as HTMLUListElement;
const emptyMessage = document.getElementById("empty") as HTMLParagraphElement;
const progressBar = document.getElementById("progress") as HTMLDivElement;
const progressFill = document.getElementById("progress-fill") as HTMLDivElement;
const progressText = document.getElementById("progress-text") as HTMLParagraphElement;

// ---------- Type guards (turn unknown input into typed values) ----------

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

function isFilter(value: string | undefined): value is Filter {
  return value === "all" || isTaskStatus(value);
}

function isAction(value: string | undefined): value is Action {
  return value !== undefined && (ACTIONS as readonly string[]).includes(value);
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate["id"] === "number" &&
    typeof candidate["title"] === "string" &&
    isTaskStatus(candidate["status"])
  );
}

// ---------- Saving and loading (so tasks survive a page reload) ----------

/** A few example tasks for the first visit, built with the model's own operations. */
function starterTasks(): Task[] {
  let tasks: Task[] = [];
  tasks = addTask(tasks, "Sketch the TaskTrail layout");
  tasks = addTask(tasks, "Wire the buttons to model.ts");
  tasks = addTask(tasks, "Deploy to GitHub Pages");
  tasks = completeTask(tasks, 1);
  tasks = advanceTask(tasks, 2);
  return tasks;
}

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return starterTasks();
    }
    const data: unknown = JSON.parse(saved);
    const items: unknown[] = Array.isArray(data) ? data : [];
    return items.filter(isTask);
  } catch {
    return starterTasks();
  }
}

function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage can be blocked (for example in private mode). The app still works for this visit.
  }
}

// ---------- App state ----------

let tasks: Task[] = loadTasks();
let currentFilter: Filter = "all";

/** Every change goes through here: store the new list, save it, redraw. */
function update(next: Task[]): void {
  tasks = next;
  saveTasks(tasks);
  render();
}

// ---------- Rendering ----------

function makeButton(action: Action, task: Task, label: string, ariaLabel: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action action-${action}`;
  button.dataset["action"] = action;
  button.dataset["id"] = String(task.id);
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}

function renderTask(task: Task): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "task";
  item.dataset["status"] = task.status;

  const badge = document.createElement("span");
  badge.className = `badge badge-${task.status}`;
  badge.textContent = STATUS_LABEL[task.status];

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title; // textContent, so a title can never inject HTML

  const actions = document.createElement("div");
  actions.className = "actions";
  if (task.status !== "done") {
    actions.append(
      makeButton("advance", task, ADVANCE_LABEL[task.status], `Move "${task.title}" to the next status`),
      makeButton("complete", task, "✓ Done", `Mark "${task.title}" as done`),
    );
  }
  actions.append(makeButton("delete", task, "✕", `Delete "${task.title}"`));

  item.append(badge, title, actions);
  return item;
}

function render(): void {
  // Filter → filterByStatus, typed to TaskStatus.
  const visible: Task[] = currentFilter === "all" ? tasks : filterByStatus(tasks, currentFilter);
  list.replaceChildren(...visible.map(renderTask));

  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent = EMPTY_TEXT[currentFilter];

  // Counts for the header and the chips come from countByStatus.
  const counts = countByStatus(tasks);
  for (const status of STATUSES) {
    (document.getElementById(`count-${status}`) as HTMLSpanElement).textContent = String(counts[status]);
    (document.getElementById(`chip-${status}`) as HTMLSpanElement).textContent = String(counts[status]);
  }
  (document.getElementById("chip-all") as HTMLSpanElement).textContent = String(tasks.length);

  for (const chip of filterBar.querySelectorAll<HTMLButtonElement>("button[data-filter]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset["filter"] === currentFilter));
  }

  const percent = tasks.length === 0 ? 0 : Math.round((counts.done / tasks.length) * 100);
  progressFill.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", String(percent));
  progressText.textContent =
    tasks.length === 0 ? "No tasks yet" : `${counts.done} of ${tasks.length} done (${percent}%)`;
}

// ---------- Events ----------

// Add → addTask, then re-render.
form.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (title === "") {
    hint.textContent = "Type a task first.";
    titleInput.focus();
    return;
  }
  hint.textContent = "";
  // New tasks start as "todo"; switch back to a view where the new task is visible.
  if (currentFilter === "in-progress" || currentFilter === "done") {
    currentFilter = "all";
  }
  update(addTask(tasks, title));
  titleInput.value = "";
  titleInput.focus();
});

titleInput.addEventListener("input", () => {
  hint.textContent = "";
});

// Advance / complete / delete → the matching typed operation, then re-render.
list.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (button === null) {
    return;
  }
  const action = button.dataset["action"];
  const id = Number(button.dataset["id"]);
  if (!isAction(action) || !Number.isInteger(id)) {
    return;
  }

  switch (action) {
    case "advance":
      update(advanceTask(tasks, id));
      break;
    case "complete":
      update(completeTask(tasks, id));
      break;
    case "delete":
      update(deleteTask(tasks, id));
      break;
    default: {
      // If a new Action is added and not handled above, this line stops tsc.
      const unhandled: never = action;
      throw new Error(`Unhandled action: ${String(unhandled)}`);
    }
  }
});

// Filter chips → filterByStatus via render().
filterBar.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const chip = target.closest<HTMLButtonElement>("button[data-filter]");
  const value = chip?.dataset["filter"];
  if (isFilter(value)) {
    currentFilter = value;
    render();
  }
});

render();
