import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useState } from "react";
import {
  PRIORITIES,
  STATUS_LABELS,
  STATUSES,
  type BoardAction,
  type Card,
  type CardChanges,
  type Priority,
  type Status,
  type Weekday,
} from "./board";
import { REPEAT_PRESETS, WEEK, sameDays } from "./repeat";
import { Button, ConfirmDialog, Field, Modal, ModalFooter, cn, fieldClasses } from "./ui";

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
  const [pointsText, setPointsText] = useState(card.points === null ? "" : String(card.points));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const update = (changes: CardChanges) => dispatch({ type: "updateCard", id: card.id, changes });

  return (
    <Modal title="Edit card" onClose={onClose}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label="Title">
          <input
            className={fieldClasses}
            value={card.title}
            onChange={(e) => update({ title: e.target.value })}
            onBlur={(e) => !e.target.value.trim() && update({ title: "Untitled" })}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={cn(fieldClasses, "min-h-24 resize-y")}
            value={card.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Notes, steps, links…"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Column">
            <select
              className={fieldClasses}
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
          </Field>
          <Field label="Priority">
            <select
              className={cn(fieldClasses, "capitalize")}
              value={card.priority}
              onChange={(e) => update({ priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0]!.toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Story points">
            <input
              className={cn(fieldClasses, "tabular-nums")}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={pointsText}
              placeholder="–"
              onChange={(e) => {
                setPointsText(e.target.value);
                const n = e.target.valueAsNumber;
                update({ points: Number.isFinite(n) && n >= 0 ? n : null });
              }}
            />
          </Field>
        </div>
        <RepeatField repeat={card.repeat} onChange={(repeat) => update({ repeat })} />
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          Created {new Date(card.createdAt).toLocaleString()}
          {card.completedAt && ` · Done ${new Date(card.completedAt).toLocaleString()}`}
        </p>
      </div>
      <ModalFooter>
        <Button
          variant="ghost"
          className="mr-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete
        </Button>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </ModalFooter>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this card?"
        description={`"${card.title}" will be removed from the board. This can't be undone.`}
        confirmLabel="Delete card"
        onConfirm={() => {
          dispatch({ type: "deleteCard", id: card.id });
          onClose();
        }}
      />
    </Modal>
  );
}

function RepeatField({ repeat, onChange }: { repeat: Weekday[] | null; onChange: (repeat: Weekday[] | null) => void }) {
  const chip = cn(
    "rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50",
    "dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
    "aria-pressed:border-blue-600 aria-pressed:bg-blue-600 aria-pressed:text-white aria-pressed:hover:bg-blue-700",
  );

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">Repeat</legend>
      <div className="flex flex-wrap gap-2">
        {REPEAT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={sameDays(preset.days, repeat)}
            className={chip}
            onClick={() => onChange(preset.days)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <ToggleGroup
        multiple
        aria-label="Repeat on these days"
        value={(repeat ?? []).map(String)}
        onValueChange={(days) => onChange(days.length ? (days.map(Number).sort() as Weekday[]) : null)}
        className="flex gap-1.5"
      >
        {WEEK.map((w) => (
          <Toggle
            key={w.day}
            value={String(w.day)}
            aria-label={w.short}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-zinc-200 text-xs font-medium text-zinc-600",
              "hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              "data-pressed:border-blue-600 data-pressed:bg-blue-50 data-pressed:text-blue-700",
              "dark:data-pressed:bg-blue-950 dark:data-pressed:text-blue-300",
            )}
          >
            {w.letter}
          </Toggle>
        ))}
      </ToggleGroup>
      <p className="text-xs text-pretty text-zinc-500 dark:text-zinc-400">
        {repeat
          ? "When you finish this card, a fresh copy appears in To Do on the next chosen day."
          : "Pick days to make this a routine that comes back after you finish it."}
      </p>
    </fieldset>
  );
}
