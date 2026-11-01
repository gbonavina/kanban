import { motion } from "motion/react";
import { useEffect, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUSES,
  totalPoints,
  type BoardAction,
  type Card,
  type Priority,
  type Status,
} from "./board";
import { describeRepeat } from "./repeat";
import {
  ArrowRightIcon,
  Celebration,
  CheckIcon,
  InboxIcon,
  ListIcon,
  PlusIcon,
  RepeatIcon,
  TrophyIcon,
  ZapIcon,
  cn,
  fieldClasses,
  formatPoints,
} from "./ui";

const DRAG_TYPE = "application/x-kanban-card";

const COLUMN_STYLES: Record<Status, { icon: ReactNode; chip: string; hint: string }> = {
  backlog: {
    icon: <InboxIcon />,
    chip: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    hint: "Tudo o que você quer fazer, algum dia.",
  },
  todo: {
    icon: <ListIcon />,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    hint: "Arraste para cá o que você fará nesta sprint.",
  },
  doing: {
    icon: <ZapIcon />,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    hint: "Arraste um cartão para cá quando começar.",
  },
  done: {
    icon: <TrophyIcon />,
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    hint: "Os cartões concluídos aparecem aqui. Bora concluir um!",
  },
};

const PRIORITY_CHIPS: Record<Priority, string> = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  high: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

/** Cards already shown once; only genuinely new cards play the pop-in. */
const seenCards = new Set<string>();

export function Column({
  status,
  title,
  cards,
  dispatch,
  onOpen,
  celebration,
}: {
  status: Status;
  title: string;
  cards: Card[];
  dispatch: (action: BoardAction) => void;
  onOpen: (card: Card) => void;
  celebration: { id: string; key: number } | null;
}) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const points = totalPoints(cards);
  const next = STATUSES[STATUSES.indexOf(status) + 1];
  const style = COLUMN_STYLES[status];

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
        "flex flex-col gap-3 rounded-3xl bg-white/55 p-3 ring-1 ring-zinc-900/5 backdrop-blur-[2px] transition-shadow duration-200",
        "dark:bg-zinc-900/50 dark:ring-white/5",
        dropIndex !== null && "ring-2 ring-violet-500/50 dark:ring-violet-400/50",
      )}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null);
      }}
      onDrop={onDrop}
      aria-label={title}
    >
      <header className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className={cn("flex size-8 items-center justify-center rounded-xl", style.chip)} aria-hidden>
          {style.icon}
        </span>
        <h2 className="font-display text-base font-bold">{title}</h2>
        <motion.span
          key={cards.length}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="rounded-full bg-zinc-900/5 px-2 text-xs font-bold text-zinc-600 tabular-nums dark:bg-white/10 dark:text-zinc-300"
        >
          {cards.length}
        </motion.span>
        {points > 0 && (
          <span className="ml-auto text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
            {formatPoints(points)}
          </span>
        )}
      </header>

      <ul className="flex min-h-2 flex-col gap-2.5">
        {cards.map((card, i) => (
          <CardItem
            key={card.id}
            card={card}
            index={i}
            showDropMarker={dropIndex === i}
            celebrationKey={celebration?.id === card.id ? celebration.key : null}
            onOpen={() => onOpen(card)}
            onAdvance={next && (() => move(card.id, next, Number.MAX_SAFE_INTEGER))}
            nextLabel={next && STATUS_LABELS[next]}
          />
        ))}
        {dropIndex === cards.length && cards.length > 0 && (
          <li className="relative" aria-hidden>
            <DropMarker />
          </li>
        )}
        {cards.length === 0 && !composing && (
          <li className="rounded-2xl border-2 border-dashed border-zinc-900/10 px-4 py-8 text-center text-sm text-pretty text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            {style.hint}
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
          placeholder="O que precisa ser feito? Enter para adicionar"
          aria-label={`Novo cartão em ${title}`}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className={cn(
            "group flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-zinc-500 transition-colors duration-150",
            "hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            "focus-visible:outline-2 focus-visible:outline-violet-600",
          )}
        >
          <span className="transition-transform duration-200 ease-out group-hover:rotate-90">
            <PlusIcon />
          </span>
          Adicionar cartão
        </button>
      )}
    </section>
  );
}

function CardItem({
  card,
  index,
  showDropMarker,
  celebrationKey,
  onOpen,
  onAdvance,
  nextLabel,
}: {
  card: Card;
  index: number;
  showDropMarker: boolean;
  celebrationKey: number | null;
  onOpen: () => void;
  onAdvance?: () => void;
  nextLabel?: string;
}) {
  const [isNew] = useState(() => !seenCards.has(card.id));
  useEffect(() => {
    seenCards.add(card.id);
  }, [card.id]);

  const done = card.status === "done";

  return (
    // The motion wrapper animates moves between positions and columns; the
    // native drag-and-drop handlers live on the inner element, untouched.
    <motion.li
      layout="position"
      layoutId={card.id}
      data-card
      className="relative"
      initial={isNew ? { opacity: 0, y: 10, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 34 },
        default: { duration: 0.25, ease: "easeOut", delay: isNew ? Math.min(index, 8) * 0.035 : 0 },
      }}
    >
      {showDropMarker && <DropMarker />}
      {celebrationKey !== null && <Celebration key={celebrationKey} />}
      <div
        className={cn(
          "group relative flex cursor-grab flex-col gap-2.5 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-zinc-900/5",
          "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
          "dark:bg-zinc-900 dark:ring-white/10",
          done && "bg-white/70 dark:bg-zinc-900/60",
        )}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, card.id);
          e.dataTransfer.effectAllowed = "move";
        }}
      >
        <div className="flex items-start gap-2.5">
          {done && (
            <motion.span
              initial={celebrationKey !== null ? { scale: 0, rotate: -45 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-hidden
            >
              <CheckIcon className="size-3" />
            </motion.span>
          )}
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "min-w-0 flex-1 text-left text-[15px] leading-snug font-semibold text-pretty break-words line-clamp-3",
              "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
              "after:absolute after:inset-0 after:content-['']",
              done && "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600",
            )}
          >
            {card.title}
          </button>
          {onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              aria-label={`Mover "${card.title}" para ${nextLabel}`}
              title={`Mover para ${nextLabel}`}
              className={cn(
                "relative z-10 -m-1 flex size-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 opacity-0 transition-[opacity,background-color,color] duration-150",
                "group-hover:opacity-100 hover:bg-violet-50 hover:text-violet-700 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-violet-600",
                "dark:hover:bg-violet-500/15 dark:hover:text-violet-300 [@media(hover:none)]:opacity-100",
              )}
            >
              <ArrowRightIcon />
            </button>
          )}
        </div>
        {card.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-pretty text-zinc-500 dark:text-zinc-400">
            {card.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className={cn("rounded-lg px-2 py-0.5", PRIORITY_CHIPS[card.priority])}>
            {PRIORITY_LABELS[card.priority]}
          </span>
          {card.repeat && (
            <span
              className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
              title="Cartão recorrente"
            >
              <RepeatIcon />
              {describeRepeat(card.repeat)}
            </span>
          )}
          {card.points !== null && (
            <span className="ml-auto rounded-lg bg-zinc-900 px-2 py-0.5 text-white tabular-nums dark:bg-white dark:text-zinc-900">
              {formatPoints(card.points)}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function DropMarker() {
  return (
    <motion.div
      layoutId="drop-marker"
      className="pointer-events-none absolute inset-x-2 -top-[7px] h-1 rounded-full bg-violet-500"
      transition={{ type: "spring", stiffness: 600, damping: 40 }}
    />
  );
}
