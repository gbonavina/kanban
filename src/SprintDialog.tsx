import { useState, type FormEvent } from "react";
import type { Sprint } from "./board";
import { addDays, localIsoDate } from "./dates";
import { Button, Field, Modal, ModalFooter, fieldClasses } from "./ui";

export function SprintDialog({
  sprintNumber,
  onStart,
  onClose,
}: {
  sprintNumber: number;
  onStart: (sprint: Omit<Sprint, "id">) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [name, setName] = useState(`Sprint ${sprintNumber}`);
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(localIsoDate(today));
  const [endDate, setEndDate] = useState(localIsoDate(addDays(today, 6)));

  function submit(e: FormEvent) {
    e.preventDefault();
    onStart({ name: name.trim() || `Sprint ${sprintNumber}`, goal: goal.trim(), startDate, endDate });
  }

  return (
    <Modal title="Iniciar uma sprint" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
            Mova os cartões com que você se compromete do Backlog para A fazer. Ao concluir a sprint, os cartões
            não terminados voltam para o Backlog.
          </p>
          <Field label="Nome">
            <input className={fieldClasses} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Meta da sprint">
            <input
              className={fieldClasses}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="O que esta sprint deve alcançar?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Início">
              <input
                className={fieldClasses}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Fim">
              <input
                className={fieldClasses}
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>
        <ModalFooter>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">
            Iniciar sprint
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
