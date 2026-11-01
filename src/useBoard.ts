import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { backend } from "./backend";
import { boardReducer, type Board, type BoardAction } from "./board";
import { newDayAction } from "./repeat";
import { createSaver, type SaveStatus } from "./saver";

type State = { status: "loading" } | { status: "failed"; error: string } | { status: "ready"; board: Board };

type Event =
  | { type: "loaded"; board: Board }
  | { type: "failed"; error: string }
  | { type: "external"; board: Board }
  | BoardAction;

function reducer(state: State, event: Event): State {
  // Ignore a repeat load (React StrictMode runs effects twice in dev) so it
  // can't replace edits made in between with the older stored board.
  if (event.type === "loaded") {
    return state.status === "ready" ? state : { status: "ready", board: event.board };
  }
  if (event.type === "failed") return { status: "failed", error: event.error };
  if (event.type === "external") return state.status === "ready" ? { status: "ready", board: event.board } : state;
  if (state.status !== "ready") return state;
  const board = boardReducer(state.board, event);
  return board === state.board ? state : { status: "ready", board };
}

/**
 * Loads the board from its backend (the server, or browser storage) and saves every change back to it.
 * Nothing is ever saved until the stored board has loaded, so a failed load
 * can't overwrite real data with an empty board.
 */
export function useBoard() {
  const [state, dispatchEvent] = useReducer(reducer, { status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saver] = useState(() => createSaver({ send: backend.save, onStatus: setSaveStatus }));
  const loadedBoard = useRef<Board | null>(null);
  const latestBoard = useRef<Board | null>(null);
  // The last board another tab saved; it is already stored, so it isn't saved again.
  const externalBoard = useRef<Board | null>(null);

  const reload = useCallback(() => {
    backend.load().then(
      (board) => {
        loadedBoard.current ??= board;
        dispatchEvent({ type: "loaded", board });
      },
      (err: Error) => dispatchEvent({ type: "failed", error: err.message }),
    );
  }, []);

  useEffect(reload, [reload]);

  const board = state.status === "ready" ? state.board : null;
  const ready = board !== null;

  // Bring recurring cards back when the board opens and whenever the date
  // changes while it stays open (checked each minute and on tab focus).
  useEffect(() => {
    if (!ready) return;
    const check = () => dispatchEvent(newDayAction(new Date()));
    check();
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [ready]);

  useEffect(() => {
    if (!board) return;
    latestBoard.current = board;
    // The freshly loaded board is already on disk; only save real changes.
    if (board === loadedBoard.current || board === externalBoard.current) return;
    saver.save(board);
  }, [board, saver]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!saver.hasUnsavedChanges() || !latestBoard.current) return;
      // Last-chance save; if it may not land in time, ask the browser to warn.
      if (!backend.saveOnUnload(latestBoard.current)) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saver]);

  // Another tab of the page changed the board: show its version here too.
  useEffect(
    () =>
      backend.onExternalChange((board) => {
        externalBoard.current = board;
        dispatchEvent({ type: "external", board });
      }),
    [],
  );

  const dispatch = useCallback((action: BoardAction) => dispatchEvent(action), []);

  return { state, saveStatus, dispatch, reload };
}
