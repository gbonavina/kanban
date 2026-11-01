# Kanban

A personal Scrum board for tracking your routine. It has four columns (Backlog, To Do, In Progress, Done), story points and priorities, and sprints with a goal and dates.

## Run it

```sh
npm install
npm start
```

Then open http://localhost:4321.

For development with hot reload, run `npm run dev` and open the URL Vite prints.

## How your data is saved

Every change is saved to `data/board.json` as you make it, with no save button. Details:

- Each save writes `data/board.json` and an identical `data/board.json.bak`, both atomically (temp file + rename), so a crash mid-write can't corrupt them.
- If `board.json` is ever unreadable, the board loads from the backup, and the broken file is kept as `board.json.corrupt-<timestamp>`.
- If the server can't be reached, the page shows "retrying" and keeps trying until the save succeeds. Closing the tab with unsaved changes makes the browser warn you first.
- The page never saves anything until your existing board has loaded, so a failed load can't overwrite your data with an empty board.

To back up or move your board, copy `data/board.json`. To keep it somewhere else, set `KANBAN_DATA=/path/to/board.json`. The data files are git-ignored.

## Scrum workflow

1. Add everything you want to do to **Backlog**.
2. Click **Start sprint**, then name it, set a goal and pick the dates.
3. Drag the cards you commit to into **To Do**, then through **In Progress** to **Done**.
4. Click **Complete sprint**. Done cards go to the sprint history and unfinished ones return to the Backlog.

## Scripts

- `npm test` runs the tests
- `npm run typecheck` type-checks the code
