import type { Board } from "./board";

export type SaveStatus = "saved" | "saving" | "error";

export interface SaverOptions {
  send: (board: Board) => Promise<void>;
  onStatus?: (status: SaveStatus) => void;
}

export interface Saver {
  save(board: Board): void;
  hasUnsavedChanges(): boolean;
}

const MAX_RETRY_DELAY_MS = 10_000;

/**
 * Persists every board change. Only one save is in flight at a time; changes
 * made meanwhile collapse into a single follow-up save of the latest board.
 * Failed saves are retried (with backoff) until one succeeds.
 */
export function createSaver({ send, onStatus = () => {} }: SaverOptions): Saver {
  let pending: Board | null = null;
  let inFlight = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  async function flush() {
    if (inFlight || !pending) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    const board = pending;
    pending = null;
    inFlight = true;
    onStatus("saving");
    try {
      await send(board);
      failures = 0;
    } catch {
      // Keep the failed board unless a newer one arrived in the meantime.
      pending ??= board;
      failures++;
    } finally {
      inFlight = false;
    }

    if (failures > 0) {
      onStatus("error");
      const delay = Math.min(1000 * 2 ** (failures - 1), MAX_RETRY_DELAY_MS);
      retryTimer = setTimeout(() => void flush(), delay);
    } else if (pending) {
      void flush();
    } else {
      onStatus("saved");
    }
  }

  return {
    save(board) {
      pending = board;
      void flush();
    },
    hasUnsavedChanges() {
      return inFlight || pending !== null;
    },
  };
}
