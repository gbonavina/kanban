import { describe, expect, it } from "vitest";
import { boardReducer, emptyBoard, type Board, type BoardAction, type Status } from "./board";

const NOW = "2026-11-01T10:00:00.000Z";
const LATER = "2026-11-02T18:30:00.000Z";

function run(...actions: BoardAction[]): Board {
  return actions.reduce(boardReducer, emptyBoard());
}

function add(id: string, status: Status = "backlog"): BoardAction {
  return { type: "addCard", id, now: NOW, title: `Task ${id}`, status };
}

function column(board: Board, status: Status): string[] {
  return board.cards.filter((c) => c.status === status).map((c) => c.id);
}

describe("boardReducer", () => {
  it("adds a new card to the end of the backlog", () => {
    const board = boardReducer(emptyBoard(), {
      type: "addCard",
      id: "c1",
      now: NOW,
      title: "Do laundry",
      status: "backlog",
    });

    expect(board.cards).toEqual([
      {
        id: "c1",
        title: "Do laundry",
        description: "",
        status: "backlog",
        priority: "medium",
        points: null,
        createdAt: NOW,
        completedAt: null,
      },
    ]);
  });

  it("moves a card into another column at the given position", () => {
    const board = run(
      add("a", "todo"),
      add("b", "todo"),
      add("c", "backlog"),
      { type: "moveCard", id: "c", now: NOW, status: "todo", index: 1 },
    );

    expect(column(board, "todo")).toEqual(["a", "c", "b"]);
    expect(column(board, "backlog")).toEqual([]);
  });

  it("reorders a card within its own column", () => {
    const board = run(
      add("a", "todo"),
      add("b", "todo"),
      add("c", "todo"),
      { type: "moveCard", id: "a", now: NOW, status: "todo", index: 2 },
    );

    expect(column(board, "todo")).toEqual(["b", "c", "a"]);
  });

  it("records when a card is finished and clears it when reopened", () => {
    const done = run(add("a", "doing"), {
      type: "moveCard",
      id: "a",
      now: LATER,
      status: "done",
      index: 0,
    });
    expect(done.cards[0]?.completedAt).toBe(LATER);

    const reopened = boardReducer(done, {
      type: "moveCard",
      id: "a",
      now: LATER,
      status: "doing",
      index: 0,
    });
    expect(reopened.cards[0]?.completedAt).toBeNull();
  });

  it("edits a card's details without moving it", () => {
    const board = run(add("a", "todo"), add("b", "todo"), {
      type: "updateCard",
      id: "a",
      changes: { title: "Gym", description: "Leg day", priority: "high", points: 3 },
    });

    expect(column(board, "todo")).toEqual(["a", "b"]);
    expect(board.cards[0]).toMatchObject({
      title: "Gym",
      description: "Leg day",
      priority: "high",
      points: 3,
    });
  });

  it("deletes a card", () => {
    const board = run(add("a"), add("b"), { type: "deleteCard", id: "a" });

    expect(column(board, "backlog")).toEqual(["b"]);
  });

  describe("sprints", () => {
    const start: BoardAction = {
      type: "startSprint",
      id: "s1",
      name: "Week 45",
      goal: "Get the house in order",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
    };

    it("starts a sprint", () => {
      const board = run(start);

      expect(board.sprint).toEqual({
        id: "s1",
        name: "Week 45",
        goal: "Get the house in order",
        startDate: "2026-11-02",
        endDate: "2026-11-08",
      });
    });

    it("archives finished cards and returns unfinished ones to the backlog on completion", () => {
      const board = run(
        add("old", "backlog"),
        start,
        add("todo", "todo"),
        add("doing", "doing"),
        add("done", "done"),
        { type: "completeSprint", now: LATER },
      );

      expect(board.sprint).toBeNull();
      expect(column(board, "backlog")).toEqual(["old", "todo", "doing"]);
      expect(column(board, "todo")).toEqual([]);
      expect(column(board, "doing")).toEqual([]);
      expect(column(board, "done")).toEqual([]);
      expect(board.history).toHaveLength(1);
      expect(board.history[0]).toMatchObject({
        id: "s1",
        name: "Week 45",
        completedAt: LATER,
      });
      expect(board.history[0]?.doneCards.map((c) => c.id)).toEqual(["done"]);
    });

    it("cannot start a second sprint while one is active", () => {
      const board = run(start, { ...start, id: "s2", name: "Other" } as BoardAction);

      expect(board.sprint?.id).toBe("s1");
    });
  });
});
