import { parseBoard, type Board } from "./board";

const URL = "/api/board";

export async function fetchBoard(): Promise<Board> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Loading the board failed (${res.status})`);
  const board = parseBoard(await res.json());
  if (!board) throw new Error("The server sent an invalid board");
  return board;
}

export async function sendBoard(board: Board, keepalive = false): Promise<void> {
  const res = await fetch(URL, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(board),
    keepalive,
  });
  if (!res.ok) throw new Error(`Saving the board failed (${res.status})`);
}
