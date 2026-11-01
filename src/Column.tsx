import { useState, type DragEvent, type FormEvent } from "react";
import { totalPoints, type BoardAction, type Card, type Status } from "./board";

const DRAG_TYPE = "application/x-kanban-card";

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
  const [draft, setDraft] = useState("");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const points = totalPoints(cards);

  function addCard(e: FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    dispatch({ type: "addCard", id: crypto.randomUUID(), now: new Date().toISOString(), title, status });
    setDraft("");
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
    dispatch({ type: "moveCard", id, now: new Date().toISOString(), status, index });
  }

  return (
    <section
      className={`column column-${status}`}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null);
      }}
      onDrop={onDrop}
    >
      <header className="column-header">
        <h2>{title}</h2>
        <span className="muted">
          {cards.length}
          {points > 0 && ` · ${points} pts`}
        </span>
      </header>

      <ul className="cards">
        {cards.map((card, i) => (
          <li
            key={card.id}
            data-card
            className={`card priority-${card.priority}${dropIndex === i ? " drop-before" : ""}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, card.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onOpen(card)}
            onKeyDown={(e) => e.key === "Enter" && onOpen(card)}
            tabIndex={0}
          >
            <span className="card-title">{card.title}</span>
            {card.description && <span className="card-desc">{card.description}</span>}
            <span className="card-meta">
              <span className={`badge badge-${card.priority}`}>{card.priority}</span>
              {card.points !== null && <span className="badge">{card.points} pts</span>}
            </span>
          </li>
        ))}
        {dropIndex === cards.length && <li className="drop-end" />}
      </ul>

      <form className="add-card" onSubmit={addCard}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ Add a card"
          aria-label={`Add a card to ${title}`}
        />
      </form>
    </section>
  );
}
