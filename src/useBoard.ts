import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { fetchBoard, sendBoard } from "./api";
import { boardReducer, type Board, type BoardAction } from "./board";
import { createSaver, type SaveStatus } from "./saver";

type State = { status: "loading" } | { status: "failed"; error: string } | { status: "ready"; board: Board };

type Event = { type: "loaded"; board: Board } | { type: "failed"; error: string } | BoardAction;

function reducer(state: State, event: Event): State {
  if (event.type === "loaded") return { status: "ready", board: event.board };
  if (event.type === "failed") return { status: "failed", error: event.error };
  if (state.status !== "ready") return state;
  return { status: "ready", board: boardReducer(state.board, event) };
}

/**
 * Loads the board from the server and saves every change back to it.
 * Nothing is ever saved until the stored board has loaded, so a failed load
 * can't overwrite real data with an empty board.
 */
export function useBoard() {
  const [state, dispatchEvent] = useReducer(reducer, { status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saver = useRef(createSaver({ send: (b) => sendBoard(b), onStatus: setSaveStatus }));
  const loadedBoard = useRef<Board | null>(null);
  const latestBoard = useRef<Board | null>(null);

  const reload = useCallback(() => {
    fetchBoard().then(
      (board) => {
        loadedBoard.current = board;
        dispatchEvent({ type: "loaded", board });
      },
      (err: Error) => dispatchEvent({ type: "failed", error: err.message }),
    );
  }, []);

  useEffect(reload, [reload]);

  const board = state.status === "ready" ? state.board : null;

  useEffect(() => {
    if (!board) return;
    latestBoard.current = board;
    // The freshly loaded board is already on disk; only save real changes.
    if (board === loadedBoard.current) return;
    saver.current.save(board);
  }, [board]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!saver.current.hasUnsavedChanges() || !latestBoard.current) return;
      // Last-chance save that outlives the page, then ask the browser to warn.
      void sendBoard(latestBoard.current, true).catch(() => {});
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const dispatch = useCallback((action: BoardAction) => dispatchEvent(action), []);

  return { state, saveStatus, dispatch, reload };
}
