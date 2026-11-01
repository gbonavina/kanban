import { parseBoard, type Board } from "./board";

const BOARD_ENDPOINT = "/api/board";
/** Browsers refuse keepalive requests with bodies over 64KB. */
const KEEPALIVE_LIMIT = 60_000;

let lastRevision = 0;

/** Rises with every save, even across page reloads, so the server can drop stale ones. */
function nextRevision(): number {
  lastRevision = Math.max(Date.now(), lastRevision + 1);
  return lastRevision;
}

export async function fetchBoard(): Promise<Board> {
  const res = await fetch(BOARD_ENDPOINT);
  if (!res.ok) throw new Error(`Falha ao carregar o quadro (${res.status})`);
  const board = parseBoard(await res.json());
  if (!board) throw new Error("O servidor enviou um quadro inválido");
  return board;
}

/** `keepalive` lets the request finish after the tab closes (small boards only). */
export async function sendBoard(board: Board, keepalive = false): Promise<void> {
  const body = JSON.stringify(board);
  const res = await fetch(BOARD_ENDPOINT, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-board-revision": String(nextRevision()) },
    body,
    keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
  });
  if (!res.ok) throw new Error(`Falha ao salvar o quadro (${res.status})`);
}
