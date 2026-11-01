import { open, readFile, rename } from "node:fs/promises";
import { emptyBoard, parseBoard, type Board } from "../src/board";

export interface BoardStore {
  load(): Promise<Board>;
  save(board: Board): Promise<void>;
}

/**
 * Stores the board in `path`, plus an identical copy in `path.bak` so a
 * damaged main file can always be recovered from the other one.
 */
export function createFileStore(path: string): BoardStore {
  const backup = `${path}.bak`;
  // Saves run one after another so they never share the temp file.
  let lastSave: Promise<void> = Promise.resolve();

  return {
    async load() {
      const main = await readIfExists(path);
      const board = readBoard(main);
      if (board) return board;

      if (main !== null) await rename(path, `${path}.corrupt-${Date.now()}`);
      return readBoard(await readIfExists(backup)) ?? emptyBoard();
    },

    save(board) {
      const text = JSON.stringify(board, null, 2);
      const run = lastSave.then(async () => {
        await writeAtomically(path, text);
        await writeAtomically(backup, text);
      });
      lastSave = run.catch(() => {});
      return run;
    },
  };
}

function readBoard(text: string | null): Board | null {
  if (text === null) return null;
  try {
    return parseBoard(JSON.parse(text));
  } catch {
    return null;
  }
}

// Write to a temp file, flush it to disk, then rename over the original, so a
// crash or power loss mid-write can never leave a half-written file behind.
async function writeAtomically(path: string, text: string): Promise<void> {
  const tmp = `${path}.tmp`;
  const file = await open(tmp, "w");
  try {
    await file.writeFile(text);
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(tmp, path);
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
