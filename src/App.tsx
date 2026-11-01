import { LayoutGroup, MotionConfig, motion } from "motion/react";
import { useCallback, useState } from "react";
import { STATUS_LABELS, STATUSES, totalPoints, type Board, type BoardAction } from "./board";
import { CardDialog } from "./CardDialog";
import { Column } from "./Column";
import { daysBetween, localIsoDate } from "./dates";
import { SprintDialog } from "./SprintDialog";
import { SprintHistoryDialog } from "./SprintHistory";
import type { SaveStatus } from "./saver";
import { Button, CalendarIcon, ConfirmDialog, FlagIcon, HistoryIcon, ProgressRing, cn } from "./ui";
import { useBoard } from "./useBoard";

export function App() {
  const { state, saveStatus, dispatch, reload } = useBoard();

  return (
    // Every animation below turns itself off for people who prefer reduced motion.
    <MotionConfig reducedMotion="user">
      {state.status === "loading" ? (
        <BoardSkeleton />
      ) : state.status === "failed" ? (
        <div className="mx-auto mt-[20dvh] flex max-w-sm flex-col items-center gap-3 px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-balance">Couldn't load your board</h1>
          <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
            {state.error}. Make sure the server is running with <code className="font-mono">npm start</code>, then
            try again.
          </p>
          <Button variant="primary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : (
        <BoardView board={state.board} saveStatus={saveStatus} dispatch={dispatch} />
      )}
    </MotionConfig>
  );
}

function BoardView({
  board,
  saveStatus,
  dispatch,
}: {
  board: Board;
  saveStatus: SaveStatus;
  dispatch: (action: BoardAction) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [showingHistory, setShowingHistory] = useState(false);
  const [celebration, setCelebration] = useState<{ id: string; key: number } | null>(null);
  const editingCard = editingId === null ? undefined : board.cards.find((c) => c.id === editingId);
  const unfinished = board.cards.filter((c) => c.status === "todo" || c.status === "doing").length;

  // Same as dispatch, plus a little celebration whenever a card is finished.
  const act = useCallback(
    (action: BoardAction) => {
      if (action.type === "moveCard" && action.status === "done") {
        const card = board.cards.find((c) => c.id === action.id);
        if (card && card.status !== "done") {
          const key = Date.now();
          setCelebration({ id: action.id, key });
          setTimeout(() => setCelebration((c) => (c?.key === key ? null : c)), 900);
        }
      }
      dispatch(action);
    },
    [board.cards, dispatch],
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col gap-7 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{todayLabel()}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            {greeting()}
          </h1>
          <SaveIndicator status={saveStatus} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setShowingHistory(true)}>
            <HistoryIcon />
            Past sprints
            {board.history.length > 0 && (
              <span className="rounded-full bg-zinc-900/5 px-1.5 text-xs font-bold tabular-nums dark:bg-white/10">
                {board.history.length}
              </span>
            )}
          </Button>
          {board.sprint ? (
            <Button onClick={() => setConfirmingComplete(true)}>
              <FlagIcon />
              Complete sprint
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setPlanning(true)}>
              <FlagIcon />
              Start sprint
            </Button>
          )}
        </div>
      </header>

      <SprintCard board={board} onStart={() => setPlanning(true)} />

      <LayoutGroup>
        <main className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status, i) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
            >
              <Column
                status={status}
                title={STATUS_LABELS[status]}
                cards={board.cards.filter((c) => c.status === status)}
                dispatch={act}
                onOpen={(card) => setEditingId(card.id)}
                celebration={celebration}
              />
            </motion.div>
          ))}
        </main>
      </LayoutGroup>


      {showingHistory && <SprintHistoryDialog history={board.history} onClose={() => setShowingHistory(false)} />}
      {editingCard && <CardDialog card={editingCard} dispatch={act} onClose={() => setEditingId(null)} />}
      {planning && (
        <SprintDialog
          sprintNumber={board.history.length + 1}
          onStart={(sprint) => {
            dispatch({ type: "startSprint", id: crypto.randomUUID(), ...sprint });
            setPlanning(false);
          }}
          onClose={() => setPlanning(false)}
        />
      )}
      <ConfirmDialog
        open={confirmingComplete}
        onOpenChange={setConfirmingComplete}
        title={`Complete ${board.sprint?.name ?? "sprint"}?`}
        description={
          unfinished > 0
            ? `Done cards move to the sprint history. ${unfinished} unfinished card${unfinished === 1 ? "" : "s"} will go back to the Backlog (recurring cards stay).`
            : "Done cards move to the sprint history."
        }
        confirmLabel="Complete sprint"
        onConfirm={() => dispatch({ type: "completeSprint", now: new Date().toISOString() })}
      />
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function SprintCard({ board, onStart }: { board: Board; onStart: () => void }) {
  const { sprint } = board;
  if (!sprint) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-dashed border-zinc-300 bg-white/50 px-6 py-5 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold text-balance">No sprint running</h2>
          <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
            Fill your Backlog, then start a sprint to commit to what you'll do this week.
          </p>
        </div>
        <Button onClick={onStart}>Plan a sprint</Button>
      </section>
    );
  }

  const daysLeft = daysBetween(localIsoDate(new Date()), sprint.endDate);
  const sprintCards = board.cards.filter((c) => c.status !== "backlog");
  const doneCards = sprintCards.filter((c) => c.status === "done");
  // Measure progress in points when cards are estimated, otherwise in cards.
  const total = totalPoints(sprintCards);
  const [done, max, unit] =
    total > 0
      ? [totalPoints(doneCards), total, total === 1 ? "pt" : "pts"]
      : [doneCards.length, sprintCards.length, sprintCards.length === 1 ? "card" : "cards"];
  const percent = max === 0 ? 0 : Math.round((done / max) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex flex-wrap items-center gap-6 overflow-hidden rounded-3xl bg-zinc-900 px-6 py-5 text-white shadow-lg dark:bg-zinc-900 dark:ring-1 dark:ring-white/10"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-violet-500/30 blur-3xl"
        aria-hidden
      />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-semibold tracking-wider text-violet-300 uppercase">Current sprint</p>
        <h2 className="font-display text-2xl font-bold text-balance">{sprint.name}</h2>
        {sprint.goal && <p className="max-w-prose text-sm text-pretty text-zinc-300">{sprint.goal}</p>}
        <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 tabular-nums">
            <CalendarIcon />
            {sprint.startDate} – {sprint.endDate}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              daysLeft < 0 ? "bg-red-500/90" : daysLeft <= 1 ? "bg-amber-400 text-amber-950" : "bg-white/10",
            )}
          >
            {daysLeft > 1
              ? `${daysLeft} days left`
              : daysLeft === 1
                ? "1 day left"
                : daysLeft === 0
                  ? "Ends today"
                  : "Overdue"}
          </span>
        </div>
      </div>
      <div className="relative flex items-center gap-4 text-white">
        <div className="text-right">
          <p className="font-display text-3xl font-bold tabular-nums">
            {done}
            <span className="text-lg text-zinc-400">/{max}</span>
          </p>
          <p className="text-xs text-zinc-400">{unit} done</p>
        </div>
        <ProgressRing percent={percent} onDark />
      </div>
    </motion.section>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { label, dot } = {
    saved: { label: "All changes saved", dot: "bg-emerald-500" },
    saving: { label: "Saving…", dot: "bg-violet-500 animate-pulse" },
    error: { label: "Not saved yet. Can't reach the server, retrying…", dot: "bg-amber-500 animate-pulse" },
  }[status];
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400",
        status === "error" && "text-amber-700 dark:text-amber-400",
      )}
      role="status"
    >
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      {label}
    </p>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-[1440px] animate-pulse flex-col gap-7 px-4 py-8 sm:px-8"
      aria-busy
      aria-label="Loading your board"
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 w-72 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-32 rounded-3xl bg-zinc-200 dark:bg-zinc-900" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s} className="flex flex-col gap-3 rounded-3xl bg-zinc-200/60 p-4 dark:bg-zinc-900">
            <div className="h-6 w-28 rounded-lg bg-zinc-300/60 dark:bg-zinc-800" />
            <div className="h-20 rounded-2xl bg-white/80 dark:bg-zinc-800/60" />
            <div className="h-20 rounded-2xl bg-white/80 dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
