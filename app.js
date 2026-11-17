// TaskTrail UI (Part 2): connects the page to the typed model from Part 1.
// Every click calls a typed operation from model.ts and then re-renders.
// There is no `any` anywhere: DOM elements are cast to their exact element
// types, and anything that comes from outside (data-* attributes, saved JSON)
// is checked by a type guard before it is used.
import { addTask, advanceTask, completeTask, countByStatus, deleteTask, filterByStatus, } from "./model.js";
const STATUSES = ["todo", "in-progress", "done"];
const ACTIONS = ["advance", "complete", "delete"];
/** Text for each status badge. Record<TaskStatus, ...> means tsc errors if a status is missing. */
const STATUS_LABEL = {
    todo: "To do",
    "in-progress": "In progress",
    done: "Done",
};
/** What the advance button says for each status (done tasks have no advance button). */
const ADVANCE_LABEL = {
    todo: "Start ▸",
    "in-progress": "Finish ▸",
    done: "",
};
const EMPTY_TEXT = {
    all: "No tasks yet. Add your first one above!",
    todo: "Nothing waiting. Every task has been started.",
    "in-progress": "Nothing in progress right now.",
    done: "Nothing finished yet. Keep going!",
};
const STORAGE_KEY = "tasktrail.tasks.v1";
// ---------- Typed DOM access ----------
const form = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const hint = document.getElementById("hint");
const filterBar = document.getElementById("filters");
const list = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty");
const progressBar = document.getElementById("progress");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
// ---------- Type guards (turn unknown input into typed values) ----------
function isTaskStatus(value) {
    return typeof value === "string" && STATUSES.includes(value);
}
function isFilter(value) {
    return value === "all" || isTaskStatus(value);
}
function isAction(value) {
    return value !== undefined && ACTIONS.includes(value);
}
function isTask(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    return (typeof candidate["id"] === "number" &&
        typeof candidate["title"] === "string" &&
        isTaskStatus(candidate["status"]));
}
// ---------- Saving and loading (so tasks survive a page reload) ----------
/** A few example tasks for the first visit, built with the model's own operations. */
function starterTasks() {
    let tasks = [];
    tasks = addTask(tasks, "Sketch the TaskTrail layout");
    tasks = addTask(tasks, "Wire the buttons to model.ts");
    tasks = addTask(tasks, "Deploy to GitHub Pages");
    tasks = completeTask(tasks, 1);
    tasks = advanceTask(tasks, 2);
    return tasks;
}
function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
            return starterTasks();
        }
        const data = JSON.parse(saved);
        const items = Array.isArray(data) ? data : [];
        return items.filter(isTask);
    }
    catch {
        return starterTasks();
    }
}
function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
    catch {
        // Storage can be blocked (for example in private mode). The app still works for this visit.
    }
}
// ---------- App state ----------
let tasks = loadTasks();
let currentFilter = "all";
/** Every change goes through here: store the new list, save it, redraw. */
function update(next) {
    tasks = next;
    saveTasks(tasks);
    render();
}
// ---------- Rendering ----------
function makeButton(action, task, label, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action action-${action}`;
    button.dataset["action"] = action;
    button.dataset["id"] = String(task.id);
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    return button;
}
function renderTask(task) {
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
        actions.append(makeButton("advance", task, ADVANCE_LABEL[task.status], `Move "${task.title}" to the next status`), makeButton("complete", task, "✓ Done", `Mark "${task.title}" as done`));
    }
    actions.append(makeButton("delete", task, "✕", `Delete "${task.title}"`));
    item.append(badge, title, actions);
    return item;
}
function render() {
    // Filter → filterByStatus, typed to TaskStatus.
    const visible = currentFilter === "all" ? tasks : filterByStatus(tasks, currentFilter);
    list.replaceChildren(...visible.map(renderTask));
    emptyMessage.hidden = visible.length > 0;
    emptyMessage.textContent = EMPTY_TEXT[currentFilter];
    // Counts for the header and the chips come from countByStatus.
    const counts = countByStatus(tasks);
    for (const status of STATUSES) {
        document.getElementById(`count-${status}`).textContent = String(counts[status]);
        document.getElementById(`chip-${status}`).textContent = String(counts[status]);
    }
    document.getElementById("chip-all").textContent = String(tasks.length);
    for (const chip of filterBar.querySelectorAll("button[data-filter]")) {
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
form.addEventListener("submit", (event) => {
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
list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const button = target.closest("button[data-action]");
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
            const unhandled = action;
            throw new Error(`Unhandled action: ${String(unhandled)}`);
        }
    }
});
// Filter chips → filterByStatus via render().
filterBar.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const chip = target.closest("button[data-filter]");
    const value = chip?.dataset["filter"];
    if (isFilter(value)) {
        currentFilter = value;
        render();
    }
});
render();
