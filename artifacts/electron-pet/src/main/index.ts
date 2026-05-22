import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { startServer } from "./server";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isPaused = false;

const TRAY_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAwklEQVQ4T2NkoBAwUqifgWoGJBf8Z2BgYGAEijMyMDAwMKAz" +
  "gIGBgYGBgYGBgfH/f4b/DAwMDIyMjAwMDAwMjIyMDIyMjIz/GRgYGBj/MzAwMDAwMjIyMIyMjI8ZGBgYGP9jsAwMDAz/GRgYGBiAapCBEUCdIYGB" +
  "gYGBhZGRkYGBgYGBkZGRgYGBgZGRkYGBgYGRkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZGBgYGBkZ" +
  "GB//8ZGBgYGBgYGCkLCgBRHBshKLu5XAAAAABJRU5ErkJggg==";

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Spidey — Virtual Tarantula", enabled: false },
    { type: "separator" },
    {
      label: "Feed (Basic Kibble)",
      click: () => mainWindow?.webContents.send("tray:cmd", { type: "feed", food: "kibble_basic" }),
    },
    {
      label: "Drop Cricket",
      click: () => mainWindow?.webContents.send("tray:cmd", { type: "dropFood", food: "cricket" }),
    },
    {
      label: "Drop Moth",
      click: () => mainWindow?.webContents.send("tray:cmd", { type: "dropFood", food: "moth" }),
    },
    { type: "separator" },
    {
      label: isPaused ? "Resume Spidey" : "Pause Spidey",
      click: () => {
        isPaused = !isPaused;
        mainWindow?.webContents.send("tray:cmd", { type: "pause", paused: isPaused });
        tray?.setContextMenu(buildTrayMenu());
      },
    },
    {
      label: "Wake Up",
      click: () => mainWindow?.webContents.send("tray:cmd", { type: "wakeup" }),
    },
    {
      label: "Revive / Reset",
      click: () => mainWindow?.webContents.send("tray:cmd", { type: "revive" }),
    },
    { type: "separator" },
    { label: "Quit Spidey", click: () => app.quit() },
  ]);
}

async function createWindow(): Promise<void> {
  await startServer();

  const primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = primary.bounds;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  ipcMain.handle("overlay:setClickThrough", (_e, enabled: boolean) => {
    if (enabled) {
      mainWindow?.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow?.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.handle("overlay:getScreenSize", () => {
    const b = screen.getPrimaryDisplay().workAreaSize;
    return { width: b.width, height: b.height };
  });

  const icon = nativeImage.createFromDataURL(TRAY_ICON);
  tray = new Tray(icon);
  tray.setToolTip("Spidey — Right-click to interact");
  tray.setContextMenu(buildTrayMenu());
  tray.on("double-click", () => {
    mainWindow?.webContents.send("tray:cmd", { type: "feed", food: "kibble_basic" });
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.spidey.pet");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
