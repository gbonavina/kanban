import { useState } from "react";
import { useModalDialog } from "./useModalDialog";
import {
  PRIORITIES,
  STATUS_LABELS,
  STATUSES,
  type BoardAction,
  type Card,
  type CardChanges,
  type Priority,
  type Status,
} from "./board";

/** Edits a card. Every field saves as you type; there is no "save" step to forget. */
export function CardDialog({
  card,
  dispatch,
  onClose,
}: {
  card: Card;
  dispatch: (action: BoardAction) => void;
  onClose: () => void;
}) {
  const ref = useModalDialog();
  const [pointsText, setPointsText] = useState(card.points === null ? "" : String(card.points));


  const update = (changes: CardChanges) => dispatch({ type: "updateCard", id: card.id, changes });

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="dialog-body">
        <label>
          Title
          <input
            value={card.title}
            onChange={(e) => update({ title: e.target.value })}
            onBlur={(e) => !e.target.value.trim() && update({ title: "Untitled" })}
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            value={card.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </label>
        <div className="row">
          <label>
            Column
            <select
              value={card.status}
              onChange={(e) =>
                dispatch({
                  type: "moveCard",
                  id: card.id,
                  now: new Date().toISOString(),
                  status: e.target.value as Status,
                  index: Number.MAX_SAFE_INTEGER,
                })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={card.priority} onChange={(e) => update({ priority: e.target.value as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Story points
            <input
              type="number"
              min={0}
              step={1}
              value={pointsText}
              onChange={(e) => {
                setPointsText(e.target.value);
                const n = e.target.valueAsNumber;
                update({ points: Number.isFinite(n) && n >= 0 ? n : null });
              }}
            />
          </label>
        </div>
        <p className="muted small">
          Created {new Date(card.createdAt).toLocaleString()}
          {card.completedAt && ` · Done ${new Date(card.completedAt).toLocaleString()}`}
        </p>
      </div>
      <footer className="dialog-footer">
        <button
          className="danger"
          onClick={() => {
            if (confirm(`Delete "${card.title}"?`)) {
              dispatch({ type: "deleteCard", id: card.id });
              onClose();
            }
          }}
        >
          Delete
        </button>
        <button className="primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
