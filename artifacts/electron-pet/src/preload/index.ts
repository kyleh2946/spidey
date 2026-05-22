import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("overlayAPI", {
  setClickThrough: (enabled: boolean) =>
    ipcRenderer.invoke("overlay:setClickThrough", enabled),
  getScreenSize: (): Promise<{ width: number; height: number }> =>
    ipcRenderer.invoke("overlay:getScreenSize"),
  onTrayCmd: (cb: (cmd: Record<string, unknown>) => void) => {
    ipcRenderer.on("tray:cmd", (_event, cmd) => cb(cmd));
  },
});
