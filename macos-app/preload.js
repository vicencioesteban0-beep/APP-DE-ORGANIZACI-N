const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getVersion:   ()      => ipcRenderer.invoke('get-app-version'),
  hideWindow:   ()      => ipcRenderer.invoke('hide-window'),
  openExternal: (url)   => ipcRenderer.invoke('open-external', url),
  platform:     process.platform,
});
