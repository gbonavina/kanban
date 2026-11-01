import type { BoardAction, Weekday } from "./board";
import { localIsoDate } from "./dates";

/** Week order shown in the UI, Monday first. */
export const WEEK: { day: Weekday; short: string; letter: string }[] = [
  { day: 1, short: "Mon", letter: "M" },
  { day: 2, short: "Tue", letter: "T" },
  { day: 3, short: "Wed", letter: "W" },
  { day: 4, short: "Thu", letter: "T" },
  { day: 5, short: "Fri", letter: "F" },
  { day: 6, short: "Sat", letter: "S" },
  { day: 0, short: "Sun", letter: "S" },
];

export const REPEAT_PRESETS: { label: string; days: Weekday[] | null }[] = [
  { label: "Never", days: null },
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
];

export function sameDays(a: Weekday[] | null, b: Weekday[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((d) => b.includes(d));
}

/** "Every day", "Weekdays", "Weekends" or e.g. "Mon, Wed, Fri". */
export function describeRepeat(days: Weekday[]): string {
  const preset = REPEAT_PRESETS.find((p) => p.days && sameDays(p.days, days));
  if (preset) return preset.label;
  if (sameDays(days, [0, 6])) return "Weekends";
  return WEEK.filter((w) => days.includes(w.day))
    .map((w) => w.short)
    .join(", ");
}

/** The action that brings recurring cards back, for the user's local date. */
export function newDayAction(now: Date): BoardAction {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  return {
    type: "newDay",
    today: localIsoDate(now),
    dayStart: dayStart.toISOString(),
    weekday: now.getDay(),
    now: now.toISOString(),
  };
}
