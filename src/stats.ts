import { PRIORITIES, totalPoints, type CompletedSprint, type Priority } from "./board";
import { daysBetween } from "./dates";

export interface SprintRecap {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  cards: number;
  points: number;
}

export interface Recap {
  /** Completed sprints, oldest first. */
  sprints: SprintRecap[];
  totalCards: number;
  totalPoints: number;
  /** Points per sprint; null before the first completed sprint. */
  averagePoints: number | null;
  /** Points of the last sprint minus the one before; null with fewer than two. */
  lastDelta: number | null;
  /** Finished cards per local weekday, index 0 = Sunday. */
  byWeekday: number[];
  /** Most consecutive local days with at least one card finished. */
  longestStreak: number;
  byPriority: Record<Priority, number>;
}

/**
 * Numbers for the sprint dashboard. `localDay` turns a completion timestamp
 * into the user's local YYYY-MM-DD date.
 */
export function recap(history: CompletedSprint[], localDay: (iso: string) => string): Recap {
  const sprints = history.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    startDate: s.startDate,
    endDate: s.endDate,
    cards: s.doneCards.length,
    points: totalPoints(s.doneCards),
  }));
  const points = sprints.map((s) => s.points);
  const total = points.reduce((a, b) => a + b, 0);
  const last = points.at(-1);
  const previous = points.at(-2);

  const finished = history.flatMap((s) => s.doneCards);
  const days = finished.flatMap((c) => (c.completedAt ? [localDay(c.completedAt)] : []));

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const day of days) byWeekday[new Date(`${day}T00:00:00Z`).getUTCDay()]!++;

  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
  for (const card of finished) byPriority[card.priority]++;

  return {
    sprints,
    totalCards: sprints.reduce((sum, s) => sum + s.cards, 0),
    totalPoints: total,
    averagePoints: sprints.length ? total / sprints.length : null,
    lastDelta: last !== undefined && previous !== undefined ? last - previous : null,
    byWeekday,
    longestStreak: longestStreak(days),
    byPriority,
  };
}

function longestStreak(days: string[]): number {
  const unique = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  unique.forEach((day, i) => {
    run = i > 0 && daysBetween(unique[i - 1]!, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
