import { useState } from "react";
import { STATUS_LABELS, STATUSES, type Board, type BoardAction, type Card } from "./board";
import { CardDialog } from "./CardDialog";
import { Column } from "./Column";
import { SprintDialog } from "./SprintDialog";
import { SprintHistory } from "./SprintHistory";
import type { SaveStatus } from "./saver";
import { daysBetween, localIsoDate } from "./dates";
import { useBoard } from "./useBoard";

export function App() {
  const { state, saveStatus, dispatch, reload } = useBoard();

  if (state.status === "loading") return <p className="centered">Loading your board…</p>;
  if (state.status === "failed") {
    return (
      <div className="centered">
        <p>Couldn't load your board: {state.error}</p>
        <p className="muted">Is the server running? Start it with <code>npm start</code>.</p>
        <button onClick={reload}>Try again</button>
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
  const [editing, setEditing] = useState<Card | null>(null);
  const [planning, setPlanning] = useState(false);
  const editingCard = editing && board.cards.find((c) => c.id === editing.id);

  function completeSprint() {
    const unfinished = board.cards.filter((c) => c.status === "todo" || c.status === "doing").length;
    const message =
      unfinished > 0
        ? `Complete the sprint? ${unfinished} unfinished card(s) will go back to the Backlog.`
        : "Complete the sprint?";
    if (confirm(message)) dispatch({ type: "completeSprint", now: new Date().toISOString() });
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>My Routine</h1>
          <SprintSummary board={board} />
        </div>
        <div className="header-actions">
          <SaveIndicator status={saveStatus} />
          {board.sprint ? (
            <button onClick={completeSprint}>Complete sprint</button>
          ) : (
            <button className="primary" onClick={() => setPlanning(true)}>
              Start sprint
            </button>
          )}
        </div>
      </header>

      <main className="columns">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            title={STATUS_LABELS[status]}
            cards={board.cards.filter((c) => c.status === status)}
            dispatch={dispatch}
            onOpen={setEditing}
          />
        ))}
      </main>

      <SprintHistory history={board.history} />

      {editingCard && (
        <CardDialog card={editingCard} dispatch={dispatch} onClose={() => setEditing(null)} />
      )}
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
    </div>
  );
}

function SprintSummary({ board }: { board: Board }) {
  const { sprint } = board;
  if (!sprint) {
    return <p className="muted">No active sprint. Plan your backlog, then start one.</p>;
  }
  const daysLeft = daysBetween(localIsoDate(new Date()), sprint.endDate);
  const sprintCards = board.cards.filter((c) => c.status !== "backlog");
  const points = (cards: Card[]) => cards.reduce((sum, c) => sum + (c.points ?? 0), 0);
  const donePoints = points(sprintCards.filter((c) => c.status === "done"));

  return (
    <div className="sprint-summary">
      <strong>{sprint.name}</strong>
      <span className="muted">
        {sprint.startDate} → {sprint.endDate} ·{" "}
        {daysLeft > 0 ? `${daysLeft} day(s) left` : daysLeft === 0 ? "ends today" : "overdue"} ·{" "}
        {donePoints}/{points(sprintCards)} pts done
      </span>
      {sprint.goal && <span className="sprint-goal">Goal: {sprint.goal}</span>}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label = {
    saved: "All changes saved",
    saving: "Saving…",
    error: "Can't reach the server, retrying…",
  }[status];
  return <span className={`save-status save-${status}`}>{label}</span>;
}
