export const STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluído",
};

/** Day of the week, 0 = Sunday … 6 = Saturday (as Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export interface Card {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  /** Story points; null when not estimated. */
  points: number | null;
  createdAt: string;
  completedAt: string | null;
  /** Days a recurring card comes back on; null for a one-off card. */
  repeat: Weekday[] | null;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  /** ISO dates, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
}

export interface CompletedSprint extends Sprint {
  completedAt: string;
  doneCards: Card[];
}

export interface Board {
  version: 1;
  /** Order within this array is the order cards appear in their column. */
  cards: Card[];
  sprint: Sprint | null;
  /** Completed sprints, most recent last. */
  history: CompletedSprint[];
}

export type BoardAction =
  | { type: "addCard"; id: string; now: string; title: string; status: Status }
  | { type: "moveCard"; id: string; now: string; status: Status; index: number }
  | { type: "updateCard"; id: string; changes: CardChanges }
  | { type: "deleteCard"; id: string }
  | ({ type: "startSprint" } & Sprint)
  | { type: "completeSprint"; now: string }
  /**
   * Sent when the board opens and whenever the date changes. `dayStart` is
   * local midnight as an ISO timestamp, `weekday` today's local weekday.
   */
  | { type: "newDay"; today: string; dayStart: string; weekday: number; now: string };

export type CardChanges = Partial<Pick<Card, "title" | "description" | "priority" | "points" | "repeat">>;

export function emptyBoard(): Board {
  return { version: 1, cards: [], sprint: null, history: [] };
}

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case "addCard":
      return {
        ...board,
        cards: [
          ...board.cards,
          {
            id: action.id,
            title: action.title,
            description: "",
            status: action.status,
            priority: "medium",
            points: null,
            createdAt: action.now,
            completedAt: null,
            repeat: null,
          },
        ],
      };

    case "moveCard": {
      const card = board.cards.find((c) => c.id === action.id);
      if (!card) return board;
      const moved: Card = {
        ...card,
        status: action.status,
        completedAt:
          action.status !== "done"
            ? null
            : card.status === "done"
              ? card.completedAt
              : action.now,
      };
      const rest = board.cards.filter((c) => c.id !== action.id);
      return { ...board, cards: insertIntoColumn(rest, moved, action.index) };
    }

    case "updateCard":
      return {
        ...board,
        cards: board.cards.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c)),
      };

    case "deleteCard":
      return { ...board, cards: board.cards.filter((c) => c.id !== action.id) };

    case "startSprint": {
      if (board.sprint) return board;
      const { type: _, ...sprint } = action;
      return { ...board, sprint };
    }

    case "completeSprint": {
      if (!board.sprint) return board;
      const doneCards = board.cards.filter((c) => c.status === "done");
      const backlog = board.cards.filter((c) => c.status === "backlog");
      const unfinished = board.cards.filter((c) => c.status === "todo" || c.status === "doing");
      // Recurring cards are routines, not sprint commitments: they stay on
      // the board, and finished ones come back fresh for the next sprint.
      const returned = unfinished.filter((c) => !c.repeat).map((c) => ({ ...c, status: "backlog" as const }));
      const routines = unfinished.filter((c) => c.repeat);
      const renewed = doneCards.filter((c) => c.repeat).map((c) => nextOccurrence(c, action.now, action.now));
      return {
        ...board,
        cards: [...backlog, ...returned, ...routines, ...renewed],
        sprint: null,
        history: [...board.history, { ...board.sprint, completedAt: action.now, doneCards }],
      };
    }

    case "newDay": {
      const due = (c: Card) =>
        c.status === "done" &&
        c.repeat?.includes(action.weekday as Weekday) &&
        c.completedAt !== null &&
        c.completedAt < action.dayStart;
      if (!board.cards.some(due)) return board;
      return {
        ...board,
        cards: [
          // The finished card stays in Done as today's record; its copy carries the schedule on.
          ...board.cards.map((c) => (due(c) ? { ...c, repeat: null } : c)),
          ...board.cards.filter(due).map((c) => nextOccurrence(c, action.today, action.now)),
        ],
      };
    }
  }
}

/** A fresh To Do copy of a recurring card. `stamp` makes its id unique. */
function nextOccurrence(card: Card, stamp: string, now: string): Card {
  return {
    ...card,
    id: `${card.id.split("~")[0]}~${stamp}`,
    status: "todo",
    createdAt: now,
    completedAt: null,
  };
}

/** Inserts `card` so it becomes the `index`-th card of its column. */
function insertIntoColumn(cards: Card[], card: Card, index: number): Card[] {
  const positions = cards.flatMap((c, i) => (c.status === card.status ? [i] : []));
  const before = positions[index];
  const at =
    before !== undefined
      ? before
      : positions.length > 0
        ? positions[positions.length - 1]! + 1
        : cards.length;
  return [...cards.slice(0, at), card, ...cards.slice(at)];
}

export function totalPoints(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + (c.points ?? 0), 0);
}

/** Returns `value` as a Board if it has the right shape, otherwise null. */
export function parseBoard(value: unknown): Board | null {
  if (!isObject(value) || value.version !== 1) return null;
  const { cards, sprint, history } = value;
  if (!Array.isArray(cards) || !cards.every(isCard)) return null;
  if (sprint !== null && !isSprint(sprint)) return null;
  if (!Array.isArray(history) || !history.every(isCompletedSprint)) return null;
  return {
    version: 1,
    cards: cards.map(withDefaults),
    sprint,
    history: history.map((h) => ({ ...h, doneCards: h.doneCards.map(withDefaults) })),
  };
}

/** Fills in fields added after a board may have been saved. */
function withDefaults(card: Card): Card {
  return { ...card, repeat: card.repeat ?? null };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCard(value: unknown): value is Card {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    STATUSES.includes(value.status as Status) &&
    PRIORITIES.includes(value.priority as Priority) &&
    (value.points === null || typeof value.points === "number") &&
    typeof value.createdAt === "string" &&
    (value.completedAt === null || typeof value.completedAt === "string") &&
    (value.repeat == null || isWeekdayList(value.repeat))
  );
}

function isWeekdayList(value: unknown): value is Weekday[] {
  return Array.isArray(value) && value.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

function isSprint(value: unknown): value is Sprint {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.goal === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string"
  );
}

function isCompletedSprint(value: unknown): value is CompletedSprint {
  return (
    isSprint(value) &&
    typeof (value as CompletedSprint).completedAt === "string" &&
    Array.isArray((value as CompletedSprint).doneCards) &&
    (value as CompletedSprint).doneCards.every(isCard)
  );
}
