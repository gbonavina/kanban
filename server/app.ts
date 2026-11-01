import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { parseBoard } from "../src/board";
import type { BoardStore } from "./fileStore";

export interface AppOptions {
  store: BoardStore;
  /** Directory holding the built frontend (vite's dist/). */
  staticDir: string;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function createApp({ store, staticDir }: AppOptions): Server {
  return createServer(async (req, res) => {
    try {
      if (req.url === "/api/board" && req.method === "GET") {
        return sendJson(res, 200, await store.load());
      }
      if (req.url === "/api/board" && req.method === "PUT") {
        const board = parseBoard(parseJson(await readBody(req)));
        if (!board) return sendJson(res, 400, { error: "Body is not a valid board" });
        await store.save(board);
        res.writeHead(204).end();
        return;
      }
      if (req.method === "GET") return await serveStatic(staticDir, req.url ?? "/", res);
      res.writeHead(404).end();
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
}

async function serveStatic(root: string, url: string, res: ServerResponse) {
  const pathname = decodeURIComponent(new URL(url, "http://x").pathname);
  const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  if (!file.startsWith(normalize(root) + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    const type = CONTENT_TYPES[extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
