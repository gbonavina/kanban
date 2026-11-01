import { useState, type DragEvent, type KeyboardEvent } from "react";
import { STATUS_LABELS, STATUSES, totalPoints, type BoardAction, type Card, type Status } from "./board";
import { describeRepeat } from "./repeat";
import { ArrowRightIcon, Button, PlusIcon, RepeatIcon, cn, fieldClasses, formatPoints } from "./ui";

const DRAG_TYPE = "application/x-kanban-card";

const COLUMN_ACCENTS: Record<Status, string> = {
  backlog: "bg-zinc-400",
  todo: "bg-blue-500",
  doing: "bg-amber-500",
  done: "bg-emerald-500",
};

const EMPTY_HINTS: Record<Status, string> = {
  backlog: "Everything you want to do, someday.",
  todo: "Drag in what you'll do this sprint.",
  doing: "Drag a card here when you start it.",
  done: "Finished cards land here.",
};

const PRIORITY_DOTS = {
  low: "bg-zinc-400",
  medium: "bg-amber-500",
  high: "bg-red-500",
} as const;

export function Column({
  status,
  title,
  cards,
  dispatch,
  onOpen,
}: {
  status: Status;
  title: string;
  cards: Card[];
  dispatch: (action: BoardAction) => void;
  onOpen: (card: Card) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const points = totalPoints(cards);
  const next = STATUSES[STATUSES.indexOf(status) + 1];

  function addDraft() {
    const title = draft.trim();
    if (title) {
      dispatch({ type: "addCard", id: crypto.randomUUID(), now: new Date().toISOString(), title, status });
    }
    setDraft("");
  }

  function onComposerKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addDraft();
    } else if (e.key === "Escape") {
      setDraft("");
      setComposing(false);
    }
  }

  function move(id: string, to: Status, index: number) {
    dispatch({ type: "moveCard", id, now: new Date().toISOString(), status: to, index });
  }

  /** Index the dragged card would land at, from the pointer's position. */
  function indexAt(e: DragEvent<HTMLElement>): number {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")];
    const i = items.findIndex((el) => {
      const box = el.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    return i === -1 ? items.length : i;
  }

  function onDragOver(e: DragEvent<HTMLElement>) {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    setDropIndex(indexAt(e));
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    const id = e.dataTransfer.getData(DRAG_TYPE);
    setDropIndex(null);
    if (!id) return;
    e.preventDefault();
    let index = indexAt(e);
    // The dragged card is still in this column's list; skip over it.
    const from = cards.findIndex((c) => c.id === id);
    if (from !== -1 && from < index) index--;
    move(id, status, index);
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900/60",
        dropIndex !== null && "ring-2 ring-blue-600/30",
      )}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null);
      }}
      onDrop={onDrop}
      aria-label={title}
    >
      <header className="flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", COLUMN_ACCENTS[status])} aria-hidden />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-zinc-200 px-2 text-xs font-medium text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-400">
          {cards.length}
        </span>
        {points > 0 && (
          <span className="ml-auto text-xs text-zinc-500 tabular-nums dark:text-zinc-400">{formatPoints(points)}</span>
        )}
      </header>

      <ul className="flex min-h-2 flex-col gap-2">
        {cards.map((card, i) => (
          <li key={card.id} data-card className="relative">
            {dropIndex === i && <DropMarker className="-top-[5px]" />}
            <CardTile
              card={card}
              onOpen={() => onOpen(card)}
              onAdvance={next && (() => move(card.id, next, Number.MAX_SAFE_INTEGER))}
              nextLabel={next && STATUS_LABELS[next]}
            />
          </li>
        ))}
        {dropIndex === cards.length && cards.length > 0 && (
          <li className="relative" aria-hidden>
            <DropMarker className="-top-[5px]" />
          </li>
        )}
        {cards.length === 0 && !composing && (
          <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-pretty text-zinc-500 dark:border-zinc-700">
            {EMPTY_HINTS[status]}
          </li>
        )}
      </ul>

      {composing ? (
        <input
          className={fieldClasses}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onComposerKey}
          // Clicking away keeps what was typed rather than throwing it away.
          onBlur={() => {
            addDraft();
            setComposing(false);
          }}
          placeholder="What needs doing? Press Enter to add"
          aria-label={`New card in ${title}`}
          autoFocus
        />
      ) : (
        <Button variant="ghost" className="justify-start" onClick={() => setComposing(true)}>
          <PlusIcon />
          Add card
        </Button>
      )}
    </section>
  );
}

function CardTile({
  card,
  onOpen,
  onAdvance,
  nextLabel,
}: {
  card: Card;
  onOpen: () => void;
  onAdvance?: () => void;
  nextLabel?: string;
}) {
  const done = card.status === "done";
  return (
    <div
      className={cn(
        "group relative flex cursor-grab flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xs",
        "hover:border-zinc-300 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, card.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "min-w-0 flex-1 text-left text-sm font-medium text-pretty break-words line-clamp-3",
            "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
            "after:absolute after:inset-0 after:content-['']",
            done && "text-zinc-400 line-through dark:text-zinc-500",
          )}
        >
          {card.title}
        </button>
        {onAdvance && (
          <button
            type="button"
            onClick={onAdvance}
            aria-label={`Move "${card.title}" to ${nextLabel}`}
            title={`Move to ${nextLabel}`}
            className={cn(
              "relative z-10 -m-1 rounded-md p-1 text-zinc-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              "hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-blue-600",
              "dark:hover:bg-zinc-800 dark:hover:text-zinc-100 [@media(hover:none)]:opacity-100",
            )}
          >
            <ArrowRightIcon />
          </button>
        )}
      </div>
      {card.description && (
        <p className="line-clamp-2 text-xs text-pretty text-zinc-500 dark:text-zinc-400">{card.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5 capitalize">
          <span className={cn("size-1.5 rounded-full", PRIORITY_DOTS[card.priority])} aria-hidden />
          {card.priority}
        </span>
        {card.repeat && (
          <span className="flex items-center gap-1" title="Recurring card">
            <RepeatIcon />
            {describeRepeat(card.repeat)}
          </span>
        )}
        {card.points !== null && (
          <span className="rounded bg-zinc-100 px-1.5 font-medium tabular-nums dark:bg-zinc-800">
            {formatPoints(card.points)}
          </span>
        )}
      </div>
    </div>
  );
}

function DropMarker({ className }: { className?: string }) {
  return <div className={cn("pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-blue-600", className)} />;
}
