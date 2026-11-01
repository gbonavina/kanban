import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Sprint } from "./board";
import { addDays, localIsoDate } from "./dates";

export function SprintDialog({
  sprintNumber,
  onStart,
  onClose,
}: {
  sprintNumber: number;
  onStart: (sprint: Omit<Sprint, "id">) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const today = new Date();
  const [name, setName] = useState(`Sprint ${sprintNumber}`);
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(localIsoDate(today));
  const [endDate, setEndDate] = useState(localIsoDate(addDays(today, 6)));

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    onStart({ name: name.trim() || `Sprint ${sprintNumber}`, goal: goal.trim(), startDate, endDate });
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-body">
          <h2>Start a sprint</h2>
          <p className="muted small">
            Move the cards you commit to from Backlog into To Do. When you complete the sprint,
            unfinished cards return to the Backlog.
          </p>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            Sprint goal
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this sprint achieve?"
            />
          </label>
          <div className="row">
            <label>
              Start
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              End
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>
        </div>
        <footer className="dialog-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Start sprint
          </button>
        </footer>
      </form>
    </dialog>
  );
}
