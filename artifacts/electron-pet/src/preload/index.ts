import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

contextBridge.exposeInMainWorld("electron", electronAPI);

contextBridge.exposeInMainWorld("windowAPI", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  togglePin: (pin: boolean) => ipcRenderer.invoke("window:togglePin", pin),
});
