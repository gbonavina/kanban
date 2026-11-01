import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyBoard, type Board } from "./board";
import { createSaver, type SaveStatus } from "./saver";

function board(n: number): Board {
  const sprint = { id: `s${n}`, name: "", goal: "", startDate: "", endDate: "" };
  return { ...emptyBoard(), sprint };
}

/** A fake server whose responses we resolve by hand. */
function fakeSend() {
  const calls: { board: Board; resolve: () => void; reject: (e: Error) => void }[] = [];
  const send = (b: Board) =>
    new Promise<void>((resolve, reject) => calls.push({ board: b, resolve, reject }));
  return { send, calls };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createSaver", () => {
  it("sends one save at a time and always ends with the latest board", async () => {
    const { send, calls } = fakeSend();
    const saver = createSaver({ send });

    saver.save(board(1));
    saver.save(board(2));
    saver.save(board(3));
    expect(calls).toHaveLength(1);

    calls[0]!.resolve();
    await vi.runAllTimersAsync();

    expect(calls.map((c) => c.board.sprint?.id)).toEqual(["s1", "s3"]);
  });

  it("keeps retrying a failed save until it succeeds, reporting status along the way", async () => {
    const { send, calls } = fakeSend();
    const statuses: SaveStatus[] = [];
    const saver = createSaver({ send, onStatus: (s) => statuses.push(s) });

    saver.save(board(1));
    calls[0]!.reject(new Error("server down"));
    await vi.advanceTimersByTimeAsync(0);
    expect(saver.hasUnsavedChanges()).toBe(true);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.board.sprint?.id).toBe("s1");

    calls[1]!.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(statuses).toEqual(["saving", "error", "saving", "saved"]);
    expect(saver.hasUnsavedChanges()).toBe(false);
  });

  it("retries with the newest board if it changed while waiting to retry", async () => {
    const { send, calls } = fakeSend();
    const saver = createSaver({ send });

    saver.save(board(1));
    calls[0]!.reject(new Error("offline"));
    await vi.advanceTimersByTimeAsync(0);
    saver.save(board(2));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(calls.map((c) => c.board.sprint?.id)).toEqual(["s1", "s2"]);
  });
});
