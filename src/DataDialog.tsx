import { useRef, useState, type ReactNode } from "react";
import { backend } from "./backend";
import { parseBoard, type Board } from "./board";
import { localIsoDate } from "./dates";
import { chooseBackupFile, reconnectBackupFile, stopBackupFile, useFileMirror, type MirrorState } from "./fileMirror";
import { Button, ConfirmDialog, DownloadIcon, Modal, ModalFooter, UploadIcon, cn } from "./ui";

/** True when the backup file needs the user's attention (shown as a dot on the header button). */
export function useDataNeedsAttention(): boolean {
  const mirror = useFileMirror();
  return backend.kind === "browser" && (mirror.status === "needs-permission" || mirror.status === "error");
}

/** Where the board is saved, plus export/import and (single-file build) the automatic backup file. */
export function DataDialog({
  board,
  onImport,
  onClose,
}: {
  board: Board;
  onImport: (board: Board) => void;
  onClose: () => void;
}) {
  const [importing, setImporting] = useState<Board | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function exportBoard() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(board, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `minha-rotina-${localIsoDate(new Date())}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function readImport(file: File) {
    setImportError(null);
    let parsed: Board | null = null;
    try {
      parsed = parseBoard(JSON.parse(await file.text()));
    } catch {
      // Not JSON; reported below.
    }
    if (parsed) setImporting(parsed);
    else setImportError(`"${file.name}" não é um quadro exportado deste app.`);
  }

  return (
    <Modal title="Seus dados" onClose={onClose}>
      <div className="flex flex-col gap-6 px-7 py-5">
        <Section title="Onde fica salvo">
          {backend.kind === "browser" ? (
            <p>
              Seu quadro fica guardado <strong className="font-semibold text-zinc-900 dark:text-zinc-100">neste navegador</strong>.
              Se os dados do navegador forem apagados, ele some junto, então mantenha uma cópia com o backup automático ou
              exportando de vez em quando.
            </p>
          ) : (
            <p>
              Seu quadro fica salvo no arquivo <code className="font-mono text-[0.8125rem]">board.json</code> deste
              computador, a cada alteração.
            </p>
          )}
        </Section>

        {backend.kind === "browser" && (
          <Section title="Backup automático em arquivo">
            <BackupFile board={board} />
          </Section>
        )}

        <Section title="Exportar e importar">
          <p>Baixe uma cópia do quadro para guardar ou levar para outro computador, ou restaure uma cópia exportada.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={exportBoard}>
              <DownloadIcon />
              Exportar
            </Button>
            <Button onClick={() => fileInput.current?.click()}>
              <UploadIcon />
              Importar…
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void readImport(file);
              }}
            />
          </div>
          {importError && (
            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {importError}
            </p>
          )}
        </Section>
      </div>
      <ModalFooter>
        <Button onClick={onClose}>Fechar</Button>
      </ModalFooter>

      <ConfirmDialog
        open={importing !== null}
        onOpenChange={(open) => !open && setImporting(null)}
        title="Substituir seu quadro?"
        description={importing ? importSummary(importing) : ""}
        confirmLabel="Substituir"
        onConfirm={() => {
          if (importing) onImport(importing);
          onClose();
        }}
      />
    </Modal>
  );
}

function importSummary(board: Board): string {
  const cards = board.cards.length;
  const sprints = board.history.length;
  return (
    `O arquivo tem ${cards} ${cards === 1 ? "cartão" : "cartões"} e ${sprints} ${sprints === 1 ? "sprint concluída" : "sprints concluídas"}. ` +
    "Tudo o que está no quadro agora será trocado por ele. Exporte antes se quiser guardar o atual."
  );
}

function BackupFile({ board }: { board: Board }) {
  const mirror = useFileMirror();
  const [failed, setFailed] = useState(false);
  const run = (action: () => Promise<void>) => () => {
    setFailed(false);
    action().catch(() => setFailed(true));
  };

  const { text, tone } = describeMirror(mirror);
  return (
    <>
      <p className={cn(tone === "warn" && "text-amber-700 dark:text-amber-400")}>{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {mirror.status === "off" && <Button onClick={run(() => chooseBackupFile(board))}>Escolher arquivo…</Button>}
        {mirror.status === "needs-permission" && (
          <Button variant="primary" onClick={run(reconnectBackupFile)}>
            Permitir
          </Button>
        )}
        {mirror.status === "error" && (
          <Button variant="primary" onClick={run(reconnectBackupFile)}>
            Tentar de novo
          </Button>
        )}
        {mirror.status !== "off" && mirror.status !== "unsupported" && (
          <>
            <Button onClick={run(() => chooseBackupFile(board))}>Trocar arquivo…</Button>
            <Button variant="ghost" onClick={run(stopBackupFile)}>
              Parar backup
            </Button>
          </>
        )}
      </div>
      {failed && (
        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          O navegador não permitiu usar esse arquivo. Tente outro lugar, como a pasta Documentos.
        </p>
      )}
    </>
  );
}

function describeMirror({ status, fileName }: MirrorState): { text: ReactNode; tone?: "warn" } {
  const name = <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{fileName}</strong>;
  switch (status) {
    case "unsupported":
      return {
        text: "Este navegador não permite salvar num arquivo automaticamente (só Chrome e Edge permitem). Use Exportar de vez em quando.",
      };
    case "off":
      return { text: "Escolha um arquivo no computador e cada alteração também será salva nele." };
    case "on":
      return { text: <>Cada alteração também é salva em {name}.</> };
    case "needs-permission":
      return { text: <>O navegador precisa da sua permissão de novo para salvar em {name}.</>, tone: "warn" };
    case "error":
      return { text: <>Não foi possível salvar em {name}. O arquivo pode ter sido movido ou apagado.</>, tone: "warn" };
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <div className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}
