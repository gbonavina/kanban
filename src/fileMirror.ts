import { useSyncExternalStore } from "react";
import type { Board } from "./board";

/**
 * Optional automatic backup for the single-file build: after the user picks a
 * file once, every save is also written there (Chrome and Edge only; they let a
 * page keep writing to a file the user chose). The browser may ask the user to
 * allow it again in a later session, which needs a click.
 */

export type MirrorStatus = "unsupported" | "off" | "needs-permission" | "on" | "error";

export interface MirrorState {
  status: MirrorStatus;
  fileName: string | null;
}

// The parts of the File System Access API used here; TypeScript's DOM types don't include them all.
type PermissionMode = { mode: "readwrite" };
interface BackupFileHandle {
  name: string;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  queryPermission(options: PermissionMode): Promise<PermissionState>;
  requestPermission(options: PermissionMode): Promise<PermissionState>;
}
type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<BackupFileHandle>;

const picker = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;

let state: MirrorState = { status: picker ? "off" : "unsupported", fileName: null };
let handle: BackupFileHandle | null = null;
let latest: Board | null = null;
let pending: Board | null = null;
let writing = false;
const listeners = new Set<() => void>();

function setState(next: MirrorState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFileMirror(): MirrorState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Restores the file chosen in an earlier session, if any. */
export async function initFileMirror(): Promise<void> {
  if (!picker) return;
  try {
    handle = await savedHandle.get();
    if (!handle) return;
    const permission = await handle.queryPermission({ mode: "readwrite" });
    setState({ status: permission === "granted" ? "on" : "needs-permission", fileName: handle.name });
  } catch {
    // Can't read the saved choice (e.g. storage blocked): just start without a backup file.
  }
}

/** Mirrors `board` to the backup file, if one is active. Writes never overlap; the newest board wins. */
export function mirrorBoard(board: Board): void {
  latest = board;
  if (state.status !== "on") return;
  pending = board;
  void drain();
}

async function drain() {
  if (writing) return;
  writing = true;
  while (pending && handle && state.status === "on") {
    const board = pending;
    pending = null;
    try {
      const file = await handle.createWritable();
      await file.write(JSON.stringify(board, null, 2));
      await file.close();
    } catch (err) {
      const lostPermission = err instanceof DOMException && err.name === "NotAllowedError";
      setState({ status: lostPermission ? "needs-permission" : "error", fileName: handle.name });
    }
  }
  writing = false;
}

/** Asks the user for a backup file and starts writing to it. Must run from a click. */
export async function chooseBackupFile(board: Board): Promise<void> {
  if (!picker) return;
  let chosen: BackupFileHandle;
  try {
    chosen = await picker({
      suggestedName: "minha-rotina.json",
      types: [{ description: "Quadro (JSON)", accept: { "application/json": [".json"] } }],
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return; // The user cancelled.
    throw err;
  }
  handle = chosen;
  await savedHandle.set(chosen).catch(() => {});
  setState({ status: "on", fileName: chosen.name });
  mirrorBoard(board);
}

/** Asks the browser again for permission to write the chosen file. Must run from a click. */
export async function reconnectBackupFile(): Promise<void> {
  if (!handle) return;
  const permission = await handle.requestPermission({ mode: "readwrite" }).catch(() => "denied" as const);
  if (permission !== "granted") return;
  setState({ status: "on", fileName: handle.name });
  if (latest) mirrorBoard(latest);
}

export async function stopBackupFile(): Promise<void> {
  handle = null;
  pending = null;
  setState({ status: "off", fileName: null });
  await savedHandle.clear().catch(() => {});
}

/** The chosen file is remembered in IndexedDB, the only storage that can hold a file handle. */
const savedHandle = {
  async get(): Promise<BackupFileHandle | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction("handles").objectStore("handles").get("backup");
      req.onsuccess = () => resolve((req.result as BackupFileHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  set: (value: BackupFileHandle) => write((store) => store.put(value, "backup")),
  clear: () => write((store) => store.delete("backup")),
};

async function write(op: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", "readwrite");
    op(tx.objectStore("handles"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("minha-rotina", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
