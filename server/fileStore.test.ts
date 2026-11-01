import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boardReducer, emptyBoard, type Board } from "../src/board";
import { createFileStore } from "./fileStore";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kanban-store-"));
  file = join(dir, "board.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function boardWith(title: string): Board {
  return boardReducer(emptyBoard(), {
    type: "addCard",
    id: title,
    now: "2026-11-01T10:00:00.000Z",
    title,
    status: "todo",
  });
}

describe("createFileStore", () => {
  it("loads what was saved, even from a fresh store instance", async () => {
    await createFileStore(file).save(boardWith("Pay rent"));

    const loaded = await createFileStore(file).load();

    expect(loaded.cards.map((c) => c.title)).toEqual(["Pay rent"]);
  });

  it("starts with an empty board when nothing has been saved yet", async () => {
    expect(await createFileStore(file).load()).toEqual(emptyBoard());
  });

  it("recovers the latest save from the backup when board.json is corrupted", async () => {
    const store = createFileStore(file);
    await store.save(boardWith("Old"));
    await store.save(boardWith("Latest"));
    await writeFile(file, '{"version": 1, "cards": [ broken');

    const loaded = await createFileStore(file).load();

    expect(loaded.cards.map((c) => c.title)).toEqual(["Latest"]);
  });

  it("keeps a corrupted board.json aside instead of discarding it", async () => {
    await writeFile(file, "not json at all");

    await createFileStore(file).load();

    const files = await readdir(dir);
    expect(files.some((f) => f.startsWith("board.json.corrupt-"))).toBe(true);
  });

  it("treats valid JSON that is not a board as corrupted", async () => {
    const store = createFileStore(file);
    await store.save(boardWith("Real"));
    await writeFile(file, JSON.stringify({ hello: "world" }));

    expect((await createFileStore(file).load()).cards.map((c) => c.title)).toEqual(["Real"]);
  });

  it("loads boards saved before recurring cards existed", async () => {
    const card = {
      id: "a",
      title: "Old card",
      description: "",
      status: "todo",
      priority: "medium",
      points: null,
      createdAt: "2026-11-01T10:00:00.000Z",
      completedAt: null,
    };
    await writeFile(file, JSON.stringify({ version: 1, cards: [card], sprint: null, history: [] }));

    const loaded = await createFileStore(file).load();

    expect(loaded.cards).toEqual([{ ...card, repeat: null }]);
    expect((await readdir(dir)).some((f) => f.includes("corrupt"))).toBe(false);
  });
});
