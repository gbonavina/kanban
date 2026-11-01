import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { createFileStore } from "./fileStore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 4321);
const dataFile = process.env.KANBAN_DATA ?? join(root, "data", "board.json");

createApp({ store: createFileStore(dataFile), staticDir: join(root, "dist") }).listen(port, () => {
  console.log(`Kanban board running at http://localhost:${port}`);
  console.log(`Saving to ${dataFile}`);
});
