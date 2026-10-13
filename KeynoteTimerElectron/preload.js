const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Main window → main process
  openExternal:  ()      => ipcRenderer.send('open-external'),
  closeExternal: ()      => ipcRenderer.send('close-external'),
  pushState:     (state) => ipcRenderer.send('push-state', state),
  getExternalStatus: ()  => ipcRenderer.invoke('external-status'),

  // Main process → main window
  onExternalOpened: (cb) => ipcRenderer.on('external-opened', cb),
  onExternalClosed: (cb) => ipcRenderer.on('external-closed', cb),
  onMenuOpenExternal: (cb) => ipcRenderer.on('menu-open-external', cb),

  // Main process → external window
  onStateUpdate: (cb) => ipcRenderer.on('state-update', (_e, state) => cb(state))
});
