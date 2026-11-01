export const STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To Do",
  doing: "In Progress",
  done: "Done",
};

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

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
  | { type: "completeSprint"; now: string };

export type CardChanges = Partial<Pick<Card, "title" | "description" | "priority" | "points">>;

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
      const unfinished = board.cards
        .filter((c) => c.status === "todo" || c.status === "doing")
        .map((c) => ({ ...c, status: "backlog" as const }));
      return {
        ...board,
        cards: [...backlog, ...unfinished],
        sprint: null,
        history: [...board.history, { ...board.sprint, completedAt: action.now, doneCards }],
      };
    }
  }
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

/** Returns `value` as a Board if it has the right shape, otherwise null. */
export function parseBoard(value: unknown): Board | null {
  if (!isObject(value) || value.version !== 1) return null;
  const { cards, sprint, history } = value;
  if (!Array.isArray(cards) || !cards.every(isCard)) return null;
  if (sprint !== null && !isSprint(sprint)) return null;
  if (!Array.isArray(history) || !history.every(isCompletedSprint)) return null;
  return value as unknown as Board;
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
    (value.completedAt === null || typeof value.completedAt === "string")
  );
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
