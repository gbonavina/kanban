import { totalPoints, type CompletedSprint } from "./board";

export function SprintHistory({ history }: { history: CompletedSprint[] }) {
  if (history.length === 0) return null;

  return (
    <details className="history">
      <summary>Past sprints ({history.length})</summary>
      <ul>
        {[...history].reverse().map((sprint) => {
          const points = totalPoints(sprint.doneCards);
          return (
            <li key={sprint.id}>
              <details>
                <summary>
                  <strong>{sprint.name}</strong>{" "}
                  <span className="muted">
                    {sprint.startDate} → {sprint.endDate} · {sprint.doneCards.length} done · {points} pts
                  </span>
                </summary>
                {sprint.goal && <p className="sprint-goal">Goal: {sprint.goal}</p>}
                <ul className="history-cards">
                  {sprint.doneCards.map((c) => (
                    <li key={c.id}>{c.title}</li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
