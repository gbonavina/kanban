import { useState } from "react";
import { STATUS_LABELS, STATUSES, totalPoints, type Board, type BoardAction } from "./board";
import { CardDialog } from "./CardDialog";
import { Column } from "./Column";
import { daysBetween, localIsoDate } from "./dates";
import { SprintDialog } from "./SprintDialog";
import { SprintHistory } from "./SprintHistory";
import type { SaveStatus } from "./saver";
import { Button, ConfirmDialog, cn } from "./ui";
import { useBoard } from "./useBoard";

export function App() {
  const { state, saveStatus, dispatch, reload } = useBoard();

  if (state.status === "loading") return <BoardSkeleton />;
  if (state.status === "failed") {
    return (
      <div className="mx-auto mt-[20dvh] flex max-w-sm flex-col items-center gap-3 px-4 text-center">
        <h1 className="text-lg font-semibold text-balance">Couldn't load your board</h1>
        <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
          {state.error}. Make sure the server is running with <code className="font-mono">npm start</code>, then
          try again.
        </p>
        <Button variant="primary" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }
  return <BoardView board={state.board} saveStatus={saveStatus} dispatch={dispatch} />;
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
  const editingCard = editingId === null ? undefined : board.cards.find((c) => c.id === editingId);
  const unfinished = board.cards.filter((c) => c.status === "todo" || c.status === "doing").length;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-balance">My Routine</h1>
          <SaveIndicator status={saveStatus} />
        </div>
        {board.sprint ? (
          <Button onClick={() => setConfirmingComplete(true)}>Complete sprint</Button>
        ) : (
          <Button variant="primary" onClick={() => setPlanning(true)}>
            Start sprint
          </Button>
        )}
      </header>

      <SprintBar board={board} />

      <main className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            title={STATUS_LABELS[status]}
            cards={board.cards.filter((c) => c.status === status)}
            dispatch={dispatch}
            onOpen={(card) => setEditingId(card.id)}
          />
        ))}
      </main>

      <SprintHistory history={board.history} />

      {editingCard && <CardDialog card={editingCard} dispatch={dispatch} onClose={() => setEditingId(null)} />}
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
            ? `Done cards move to the sprint history. ${unfinished} unfinished card${unfinished === 1 ? "" : "s"} will go back to the Backlog.`
            : "Done cards move to the sprint history."
        }
        confirmLabel="Complete sprint"
        onConfirm={() => dispatch({ type: "completeSprint", now: new Date().toISOString() })}
      />
    </div>
  );
}

function SprintBar({ board }: { board: Board }) {
  const { sprint } = board;
  if (!sprint) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-pretty text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No active sprint. Fill your Backlog, then start a sprint to commit to what you'll do this week.
      </p>
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
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-balance">{sprint.name}</h2>
          {sprint.goal && <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">{sprint.goal}</p>}
        </div>
        <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {sprint.startDate} – {sprint.endDate} ·{" "}
          <span className={cn(daysLeft < 0 && "font-medium text-red-600 dark:text-red-400")}>
            {daysLeft > 1
              ? `${daysLeft} days left`
              : daysLeft === 1
                ? "1 day left"
                : daysLeft === 0
                  ? "Ends today"
                  : "Overdue"}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="progressbar"
          aria-label="Sprint progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {done}/{max} {unit}
        </span>
      </div>
    </section>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { label, dot } = {
    saved: { label: "All changes saved", dot: "bg-emerald-500" },
    saving: { label: "Saving…", dot: "bg-zinc-400" },
    error: { label: "Not saved yet. Can't reach the server, retrying…", dot: "bg-amber-500" },
  }[status];
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400",
        status === "error" && "font-medium text-amber-700 dark:text-amber-400",
      )}
      role="status"
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </p>
  );
}

function BoardSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6" aria-busy aria-label="Loading your board">
      <div className="h-7 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-12 rounded-xl bg-zinc-200/70 dark:bg-zinc-900" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s} className="flex flex-col gap-2 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
            <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-16 rounded-lg bg-white dark:bg-zinc-800/60" />
            <div className="h-16 rounded-lg bg-white dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
