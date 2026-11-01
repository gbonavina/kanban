import { fetchBoard, sendBoard } from "./api";
import type { Board } from "./board";
import { initFileMirror, mirrorBoard } from "./fileMirror";
import { BOARD_KEY, createLocalStore, readBoard, type LocalStore } from "./localStore";

/** Where the board is kept: the local server (app, `npm start`) or the browser (single HTML file). */
export interface BoardBackend {
  kind: "server" | "browser";
  load(): Promise<Board>;
  save(board: Board): Promise<void>;
  /** A last save as the page closes. Returns true if the board is already safely stored. */
  saveOnUnload(board: Board): boolean;
  /** Calls `listener` with boards saved by another tab of this page. */
  onExternalChange(listener: (board: Board) => void): () => void;
  /** Shown while saves keep failing. */
  saveErrorLabel: string;
  /** Shown when the board can't load, after the error. */
  loadHelp: string;
}

const serverBackend: BoardBackend = {
  kind: "server",
  load: fetchBoard,
  save: (board) => sendBoard(board),
  saveOnUnload(board) {
    void sendBoard(board, true).catch(() => {});
    return false;
  },
  onExternalChange: () => () => {},
  saveErrorLabel: "Ainda não salvo. Sem conexão com o servidor, tentando de novo…",
  loadHelp: "Verifique se o servidor está rodando com npm start e tente de novo.",
};

function createBrowserBackend(): BoardBackend {
  // Created on first use: reading `localStorage` throws when the browser blocks it,
  // and that should show up as a failed load, not crash the page.
  let store: LocalStore | null = null;
  const getStore = () => (store ??= createLocalStore(window.localStorage));

  return {
    kind: "browser",
    async load() {
      void initFileMirror();
      try {
        return getStore().load();
      } catch {
        throw new Error("Não foi possível ler o armazenamento do navegador");
      }
    },
    async save(board) {
      getStore().save(board);
      mirrorBoard(board);
    },
    saveOnUnload(board) {
      try {
        getStore().save(board); // localStorage writes synchronously, so this is done before the page goes.
        return true;
      } catch {
        return false;
      }
    },
    onExternalChange(listener) {
      const onStorage = (e: StorageEvent) => {
        if (e.key !== BOARD_KEY) return;
        const board = readBoard(e.newValue);
        if (board) listener(board);
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    saveErrorLabel: "Ainda não salvo. O navegador recusou guardar o quadro, tentando de novo…",
    loadHelp: "O navegador bloqueou o armazenamento desta página. Permita que ela guarde dados e tente de novo.",
  };
}

/** `npm run build:html` builds with mode "html": the single file keeps everything in the browser. */
export const backend: BoardBackend = import.meta.env.MODE === "html" ? createBrowserBackend() : serverBackend;
