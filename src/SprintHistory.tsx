import { totalPoints, type CompletedSprint } from "./board";
import { formatPoints } from "./ui";

export function SprintHistory({ history }: { history: CompletedSprint[] }) {
  if (history.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold">
        Past sprints <span className="font-normal text-zinc-500 tabular-nums">({history.length})</span>
      </h2>
      <ul className="divide-y divide-zinc-200 overflow-hidden rounded-3xl border border-zinc-900/5 bg-white/70 shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {[...history].reverse().map((sprint) => (
          <li key={sprint.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <span className="font-display text-sm font-bold">{sprint.name}</span>
                <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {sprint.startDate} – {sprint.endDate}
                </span>
                <span className="ml-auto text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {sprint.doneCards.length} done · {formatPoints(totalPoints(sprint.doneCards))}
                </span>
              </summary>
              <div className="flex flex-col gap-2 px-5 pb-4">
                {sprint.goal && (
                  <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">Goal: {sprint.goal}</p>
                )}
                {sprint.doneCards.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                    {sprint.doneCards.map((c) => (
                      <li key={c.id}>{c.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">Nothing was finished in this sprint.</p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
