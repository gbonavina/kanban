import { describe, expect, it } from "vitest";
import { emptyBoard, type Board } from "./board";
import { createLocalStore } from "./localStore";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const board: Board = {
  ...emptyBoard(),
  sprint: { id: "s1", name: "Sprint 1", goal: "", startDate: "2026-11-02", endDate: "2026-11-08" },
};

describe("createLocalStore", () => {
  it("starts with an empty board", () => {
    expect(createLocalStore(memoryStorage(), "b").load()).toEqual(emptyBoard());
  });

  it("loads what it saved, and keeps a backup copy", () => {
    const storage = memoryStorage();
    createLocalStore(storage, "b").save(board);
    expect(createLocalStore(storage, "b").load()).toEqual(board);
    expect(storage.data.get("b.bak")).toBe(storage.data.get("b"));
  });

  it("falls back to the backup when the main copy is damaged, and sets the damaged one aside", () => {
    const storage = memoryStorage();
    createLocalStore(storage, "b").save(board);
    storage.setItem("b", "{not json");

    expect(createLocalStore(storage, "b").load()).toEqual(board);
    expect(storage.data.has("b")).toBe(false);
    const corrupt = [...storage.data.keys()].find((k) => k.startsWith("b.corrupt-"));
    expect(corrupt && storage.data.get(corrupt)).toBe("{not json");
  });

  it("lets a failed save throw, so the saver can report and retry it", () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    expect(() => createLocalStore(storage, "b").save(board)).toThrow();
  });
});
