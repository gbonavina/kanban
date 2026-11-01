import type { BoardAction, Weekday } from "./board";
import { localIsoDate } from "./dates";

/** Week order shown in the UI, Monday first. */
export const WEEK: { day: Weekday; short: string; letter: string }[] = [
  { day: 1, short: "Seg", letter: "S" },
  { day: 2, short: "Ter", letter: "T" },
  { day: 3, short: "Qua", letter: "Q" },
  { day: 4, short: "Qui", letter: "Q" },
  { day: 5, short: "Sex", letter: "S" },
  { day: 6, short: "Sáb", letter: "S" },
  { day: 0, short: "Dom", letter: "D" },
];

export const REPEAT_PRESETS: { label: string; days: Weekday[] | null }[] = [
  { label: "Nunca", days: null },
  { label: "Todo dia", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Dias úteis", days: [1, 2, 3, 4, 5] },
];

export function sameDays(a: Weekday[] | null, b: Weekday[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((d) => b.includes(d));
}

/** "Todo dia", "Dias úteis", "Fins de semana" or e.g. "Seg, Qua, Sex". */
export function describeRepeat(days: Weekday[]): string {
  const preset = REPEAT_PRESETS.find((p) => p.days && sameDays(p.days, days));
  if (preset) return preset.label;
  if (sameDays(days, [0, 6])) return "Fins de semana";
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
