import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog, nativeTheme, shell } from "electron";
import { createApp } from "../server/app";
import { createFileStore } from "../server/fileStore";

// A fixed port keeps the page's origin the same between launches, so things it
// keeps in localStorage (the light/dark choice) survive a restart. If another
// program already uses it, any free port works; only that preference resets.
const PREFERRED_PORT = 47821;

// Closing waits for the board to finish saving: up to this many retries, 300ms apart.
const MAX_CLOSE_RETRIES = 10;

let server: Server | null = null;
let mainWindow: BrowserWindow | null = null;

// Two copies of the app would both write the same file, so only one may run.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(start, (err) => fail(err));
}

async function start() {
  try {
    const dataFile = process.env.KANBAN_DATA ?? join(app.getPath("userData"), "board.json");
    mkdirSync(dirname(dataFile), { recursive: true });
    const staticDir = join(app.getAppPath(), "dist");
    server = createApp({ store: createFileStore(dataFile), staticDir });
    const port = await listen(server, PREFERRED_PORT).catch(() => listen(server!, 0));
    mainWindow = createWindow(`http://127.0.0.1:${port}`);
  } catch (err) {
    fail(err);
  }
}

// Bound to 127.0.0.1 only: the API has no auth, so it mustn't be reachable from the network.
function listen(srv: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      srv.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      srv.off("error", onError);
      resolve((srv.address() as AddressInfo).port);
    };
    srv.once("error", onError);
    srv.once("listening", onListening);
    srv.listen(port, "127.0.0.1");
  });
}

function createWindow(origin: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    // The page paper color, so the window never flashes the wrong shade before it loads.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0e0f13" : "#f6f4ef",
    icon: join(app.getAppPath(), "build", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  win.once("ready-to-show", () => win.show());

  // Links that leave the app open in the system browser instead of a new app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin === origin) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });

  // The page refuses to unload while a save is still on its way. A browser asks
  // the user; Electron would silently keep the window open. When the user is
  // closing the window, wait for the save and try again, and only ask if
  // saving keeps failing. Reloads (Ctrl+R) go ahead: the page sends a
  // last-chance save, and the server here keeps running to receive it.
  let closing = false;
  let closeRetries = 0;
  win.on("close", () => {
    closing = true;
  });
  win.webContents.on("will-prevent-unload", (event) => {
    if (!closing) {
      event.preventDefault();
      return;
    }
    closing = false;
    if (closeRetries < MAX_CLOSE_RETRIES) {
      closeRetries++;
      setTimeout(() => win.close(), 300);
      return;
    }
    closeRetries = 0;
    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      buttons: ["Sair mesmo assim", "Ficar"],
      defaultId: 1,
      cancelId: 1,
      title: "Alterações não salvas",
      message: "Algumas alterações ainda não foram salvas.",
      detail: "Se sair agora, elas podem ser perdidas.",
    });
    if (choice === 0) event.preventDefault();
  });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  void win.loadURL(origin);
  return win;
}

app.on("window-all-closed", () => {
  server?.close();
  app.quit();
});

function fail(err: unknown) {
  console.error(err);
  dialog.showErrorBox("Não foi possível abrir o quadro", err instanceof Error ? err.message : String(err));
  app.exit(1);
}
