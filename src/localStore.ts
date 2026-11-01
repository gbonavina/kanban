import { emptyBoard, parseBoard, type Board } from "./board";

/** Namespaced: every page opened from a file in Chrome shares one storage area. */
export const BOARD_KEY = "minha-rotina:board";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface LocalStore {
  load(): Board;
  save(board: Board): void;
}

/**
 * Keeps the board in browser storage (localStorage), with the same safety net
 * as the file store: an identical backup copy, and a damaged main copy is set
 * aside instead of being overwritten.
 */
export function createLocalStore(storage: KeyValueStorage, key = BOARD_KEY): LocalStore {
  const backupKey = `${key}.bak`;

  return {
    load() {
      const main = storage.getItem(key);
      const board = readBoard(main);
      if (board) return board;

      if (main !== null) {
        try {
          storage.setItem(`${key}.corrupt-${Date.now()}`, main);
        } catch {
          // No room to keep the damaged copy; the backup below still has the data.
        }
        storage.removeItem(key);
      }
      return readBoard(storage.getItem(backupKey)) ?? emptyBoard();
    },

    save(board) {
      const text = JSON.stringify(board);
      storage.setItem(key, text);
      storage.setItem(backupKey, text);
    },
  };
}

export function readBoard(text: string | null): Board | null {
  if (text === null) return null;
  try {
    return parseBoard(JSON.parse(text));
  } catch {
    return null;
  }
}
