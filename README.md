# Kanban

A personal Scrum board for tracking your routine. It has four columns (Backlog, To Do, In Progress, Done), story points and priorities, and sprints with a goal and dates.

## Install the app

Download the latest build from the [Releases page](https://github.com/gbonavina/kanban/releases):

- **Windows:** `minha-rotina-<version>-setup.exe` installs it for your user, with a Start menu shortcut (no admin rights needed). `minha-rotina-<version>-portable.exe` runs without installing. The builds aren't code-signed, so the first time Windows SmartScreen says "Windows protected your PC": click **More info**, then **Run anyway**.
- **Linux:** `minha-rotina-<version>-amd64.deb` for Ubuntu/Debian (`sudo apt install ./minha-rotina-*.deb`), or `minha-rotina-<version>-x86_64.AppImage` for any distro (`chmod +x` it and run it).

Only one copy of the app runs at a time; opening it again brings the existing window forward.

## Run from source

```sh
npm install
npm run app
```

`npm run app` builds the frontend and opens it in the desktop app. (It passes `--no-sandbox` because Electron run straight from `node_modules` can't use Chromium's sandbox on recent Ubuntu; the packaged builds don't need it.)

To use it in a browser instead, run `npm start` and open http://localhost:4321. For development with hot reload, run `npm run dev` and open the URL Vite prints.

## Release a new version

Push a version tag:

```sh
git tag v1.1.0
git push origin v1.1.0
```

The GitHub Actions workflow (`.github/workflows/release.yml`) runs the tests, builds the Windows and Linux files on real Windows and Linux machines, and publishes them as a GitHub Release named after the tag. You can also start it by hand from the **Actions** tab to get the files as build artifacts without making a release.

To build the Linux files locally, run `npm run dist`; they land in `release/`.

## How your data is saved

Every change is saved to `board.json` as you make it, with no save button. Where that file lives:

| Running it as | File |
| --- | --- |
| Desktop app on Linux | `~/.config/Minha Rotina/board.json` |
| Desktop app on Windows | `%APPDATA%\Minha Rotina\board.json` |
| `npm start` / `npm run dev` | `data/board.json` in this folder |

Details:

- Each save writes `board.json` and an identical `board.json.bak`, both atomically (temp file + rename), so a crash mid-write can't corrupt them.
- If `board.json` is ever unreadable, the board loads from the backup, and the broken file is kept as `board.json.corrupt-<timestamp>`.
- If the server can't be reached, the page shows "retrying" and keeps trying until the save succeeds. Closing the window or tab with unsaved changes waits for the save (the app) or warns you first (a browser).
- The page never saves anything until your existing board has loaded, so a failed load can't overwrite your data with an empty board.

To back up or move your board, copy `board.json`. To keep it somewhere else, set `KANBAN_DATA=/path/to/board.json` (works for the app too). The files in `data/` are git-ignored.

## Scrum workflow

1. Add everything you want to do to **Backlog**.
2. Click **Start sprint**, then name it, set a goal and pick the dates.
3. Drag the cards you commit to into **To Do**, then through **In Progress** to **Done**.
4. Click **Complete sprint**. Done cards go to the sprint history (open it with **Past sprints** in the header) and unfinished ones return to the Backlog.

## Dashboard

Switch to **Painel** in the header for a recap of your completed sprints: velocity per sprint, the days of the week you finish the most, your longest streak, what priority your finished work had, and a table of every sprint.

## Recurring cards

Open a card and pick when it repeats under **Repeat**: every day, weekdays, or any days you choose. When you finish a recurring card it stays in Done for the day, and a fresh copy appears in To Do on its next chosen day. That happens when you open the board, or at midnight if it's already open. Recurring cards stay on the board when a sprint completes instead of going back to the Backlog.

## Scripts

- `npm run app` opens the desktop app
- `npm run dist` packages the desktop app for the current OS into `release/`
- `npm test` runs the tests
- `npm run typecheck` type-checks the code
