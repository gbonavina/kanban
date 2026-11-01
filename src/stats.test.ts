import { describe, expect, it } from "vitest";
import type { Card, CompletedSprint, Priority } from "./board";
import { recap } from "./stats";

let nextId = 0;
function done(completedAt: string, points: number | null = null, priority: Priority = "medium"): Card {
  return {
    id: `c${nextId++}`,
    title: "Task",
    description: "",
    status: "done",
    priority,
    points,
    createdAt: "2026-10-01T10:00:00.000Z",
    completedAt,
    repeat: null,
  };
}

function sprint(name: string, startDate: string, doneCards: Card[]): CompletedSprint {
  return { id: name, name, goal: "", startDate, endDate: startDate, completedAt: `${startDate}T23:00:00.000Z`, doneCards };
}

// Tests read dates in UTC so they don't depend on the machine's timezone.
const utcDay = (iso: string) => iso.slice(0, 10);

describe("recap", () => {
  it("totals cards and points per sprint, oldest first", () => {
    const r = recap(
      [
        sprint("S1", "2026-10-05", [done("2026-10-05T09:00:00Z", 3), done("2026-10-06T09:00:00Z")]),
        sprint("S2", "2026-10-12", [done("2026-10-12T09:00:00Z", 5)]),
      ],
      utcDay,
    );

    expect(r.sprints.map((s) => [s.name, s.cards, s.points])).toEqual([
      ["S1", 2, 3],
      ["S2", 1, 5],
    ]);
    expect(r.totalCards).toBe(3);
    expect(r.totalPoints).toBe(8);
  });

  it("averages points per sprint and compares the last sprint with the one before", () => {
    const r = recap(
      [
        sprint("S1", "2026-10-05", [done("2026-10-05T09:00:00Z", 4)]),
        sprint("S2", "2026-10-12", [done("2026-10-12T09:00:00Z", 8)]),
        sprint("S3", "2026-10-19", [done("2026-10-19T09:00:00Z", 6)]),
      ],
      utcDay,
    );

    expect(r.averagePoints).toBe(6);
    expect(r.lastDelta).toBe(-2);
  });

  it("has no average or comparison without enough sprints", () => {
    expect(recap([], utcDay)).toMatchObject({ averagePoints: null, lastDelta: null, totalCards: 0 });
    expect(recap([sprint("S1", "2026-10-05", [])], utcDay).lastDelta).toBeNull();
  });

  it("counts completions by day of the week, Sunday = 0", () => {
    // 2026-10-05 is a Monday, 2026-10-11 a Sunday.
    const r = recap(
      [
        sprint("S1", "2026-10-05", [
          done("2026-10-05T09:00:00Z"),
          done("2026-10-05T18:00:00Z"),
          done("2026-10-11T09:00:00Z"),
        ]),
      ],
      utcDay,
    );

    expect(r.byWeekday).toEqual([1, 2, 0, 0, 0, 0, 0]);
  });

  it("uses the user's local day, not the UTC one", () => {
    // 01:00 UTC on Tuesday is still Monday evening in Brasília (UTC-3).
    const brasilia = (iso: string) => new Date(Date.parse(iso) - 3 * 3600_000).toISOString().slice(0, 10);
    const r = recap([sprint("S1", "2026-10-05", [done("2026-10-06T01:00:00Z")])], brasilia);

    expect(r.byWeekday[1]).toBe(1);
  });

  it("finds the longest run of consecutive days with something finished", () => {
    const r = recap(
      [
        sprint("S1", "2026-10-05", [
          done("2026-10-05T09:00:00Z"),
          done("2026-10-06T09:00:00Z"),
          done("2026-10-06T20:00:00Z"),
          done("2026-10-09T09:00:00Z"),
        ]),
        // The streak carries across sprints.
        sprint("S2", "2026-10-10", [done("2026-10-10T09:00:00Z"), done("2026-10-11T09:00:00Z")]),
      ],
      utcDay,
    );

    expect(r.longestStreak).toBe(3);
  });

  it("splits finished cards by priority", () => {
    const r = recap(
      [sprint("S1", "2026-10-05", [done("2026-10-05T09:00:00Z", null, "high"), done("2026-10-05T10:00:00Z", null, "low"), done("2026-10-05T11:00:00Z", null, "high")])],
      utcDay,
    );

    expect(r.byPriority).toEqual({ high: 2, medium: 0, low: 1 });
  });
});
