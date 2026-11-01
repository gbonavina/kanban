import { totalPoints, type CompletedSprint } from "./board";
import { Button, Modal, ModalFooter, formatPoints } from "./ui";

/** Completed sprints, newest first, shown on demand in a dialog. */
export function SprintHistoryDialog({ history, onClose }: { history: CompletedSprint[]; onClose: () => void }) {
  return (
    <Modal title="Past sprints" onClose={onClose} className="max-w-xl">
      <div className="px-7 py-5">
        {history.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-zinc-900/10 px-4 py-8 text-center text-sm text-pretty text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            No completed sprints yet. When you complete a sprint, it shows up here with everything you finished.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {[...history].reverse().map((sprint, i) => (
              <li key={sprint.id}>
                <details className="group" open={i === 0}>
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
        )}
      </div>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
