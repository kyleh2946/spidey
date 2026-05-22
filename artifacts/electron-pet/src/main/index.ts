import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { startServer } from "./server";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createTrayIcon(): Tray {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAABxElEQVRYhe2Wy0rDQBSGv5mkaZqmlUoRL1hEXIgbFwouXLnwCXwCH8GFC1/Bl3DhA7hwIYKIohYvoNiLF7xUvBRtbdMkM8eFBi0mbZLBhQv/VZiZ8/3nJHNmBiIiIiIiIiIi8gsBMAPsAudAC3gELoANYBZIJgkGYA3YBXaBFWAMKBEAvwBSoAvUgSrQBFpAG6gBXaAHFIHE5xwDg8BHoA9sAlfALVAGZoF54BJYAhbDXAEugArgBFpADRgD5oE2cA2Mgx1gBmgCVaACzAFzwCqwB9SAFrAFrAMbQBHIAYfAAdABSoADXIBTIAGYwCGwDByHM1cDloBl4A64Ai6Bc+AGeAcugQ3gGXgHXoE94A14BN6AW+AQeAZegEPgGTgBjoBT4AR4Ac6AS+ACOAUuAEfgCHgEnoBH4Bk4Bo6BS+AUOAF2gTXgAFgHNoFXYAf4Ac6AP8AnkADfQA44A84BEzgArgNzwB6wCiyEM1cBFoFlYAGoAk3gAKgBdeAQKANHQAQsgQPgGXgHzoEuMAHWgBGwCMyHOQeASaAOLAILwBpQAo6BQ2AKmAdmgVmgCHSBJtAGzoApIAeMAGPgHNgHpoPYDvAFDHM3EDgAAAAASUVORK5CYII="
  );

  const t = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Spidey", click: () => mainWindow?.show() },
    { label: "Hide", click: () => mainWindow?.hide() },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  t.setToolTip("Spidey - Virtual Tarantula");
  t.setContextMenu(contextMenu);
  t.on("double-click", () => {
    if (mainWindow?.isVisible()) mainWindow.hide();
    else mainWindow?.show();
  });
  return t;
}

async function createWindow() {
  await startServer();

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const windowW = 380;
  const windowH = 620;

  mainWindow = new BrowserWindow({
    width: windowW,
    height: windowH,
    x: screenW - windowW - 20,
    y: screenH - windowH - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  tray = createTrayIcon();
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.spidey.pet");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:close", () => mainWindow?.hide());
ipcMain.handle("window:togglePin", (_event, pin: boolean) => {
  mainWindow?.setAlwaysOnTop(pin, "floating");
});
