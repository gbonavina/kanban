import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boardReducer, emptyBoard, type Board } from "../src/board";
import { createApp } from "./app";
import { createFileStore } from "./fileStore";

let dir: string;
let server: Server;
let url: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kanban-api-"));
  server = createApp({ store: createFileStore(join(dir, "board.json")), staticDir: dir });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}/api/board`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

function boardWith(title: string): Board {
  return boardReducer(emptyBoard(), {
    type: "addCard",
    id: title,
    now: "2026-11-01T10:00:00.000Z",
    title,
    status: "backlog",
  });
}

function put(body: unknown, revision?: number) {
  return fetch(url, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(revision !== undefined && { "x-board-revision": String(revision) }),
    },
    body: JSON.stringify(body),
  });
}

describe("/api/board", () => {
  it("returns the board that was last saved", async () => {
    const saved = await put(boardWith("Meditate"));
    expect(saved.status).toBe(204);

    const res = await fetch(url);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(boardWith("Meditate"));
  });

  it("rejects data that is not a board and keeps the saved board intact", async () => {
    await put(boardWith("Meditate"));

    const res = await put({ cards: "oops" });

    expect(res.status).toBe(400);
    expect(await (await fetch(url)).json()).toEqual(boardWith("Meditate"));
  });

  it("handles many saves arriving at once without corrupting the board", async () => {
    const boards = Array.from({ length: 10 }, (_, i) => boardWith(`Task ${i}`));

    const results = await Promise.all(boards.map(put));

    expect(results.map((r) => r.status)).toEqual(Array(10).fill(204));
    expect(boards).toContainEqual(await (await fetch(url)).json());
  });

  it("ignores a save that arrives after a newer revision was already stored", async () => {
    await put(boardWith("Newer"), 2);

    const late = await put(boardWith("Older"), 1);

    expect(late.status).toBe(204);
    expect(await (await fetch(url)).json()).toEqual(boardWith("Newer"));
  });
});
