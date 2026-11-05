# TypeTasks

A small, type-safe task tracker built with TypeScript.

## Part 1: the typed model

Everything lives in [`model.ts`](./model.ts):

| What | Type |
| --- | --- |
| `TaskStatus` | `"todo" \| "in-progress" \| "done"` (only these three values are allowed) |
| `Task` | `{ id: number; title: string; status: TaskStatus }` |
| `addTask(tasks, title)` | adds a new `"todo"` task with the next unique id |
| `completeTask(tasks, id)` | marks that task `"done"` |
| `filterByStatus(tasks, status)` | keeps only tasks with that status |

My own extra operations:

| What | Does |
| --- | --- |
| `advanceTask(tasks, id)` | moves a task one step: `todo → in-progress → done` |
| `renameTask(tasks, id, title)` | changes a task's title |
| `deleteTask(tasks, id)` | removes a task |
| `countByStatus(tasks)` | returns counts for every status, e.g. `{ todo: 2, "in-progress": 1, done: 3 }` |

Every operation returns a **new** array and never changes the one it was given.

### Proof the types are tight

These were tried and each one fails to compile (see the comments at the bottom of `model.ts`):

- a `Task` with no `status` → *Property 'status' is missing*
- `id: "3"` → *Type 'string' is not assignable to type 'number'*
- `filterByStatus(tasks, "finished")` → *not assignable to parameter of type 'TaskStatus'*

## Run it

```bash
npm install
npx tsc        # compiles model.ts to dist/ with zero errors
```

Part 2 adds the UI and deploys the app.
