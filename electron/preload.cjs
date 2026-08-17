const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('priceusNative', {
  isDesktop: true,
  platform: process.platform,
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },
  onToggleLogDrawer: (callback) => {
    ipcRenderer.on('toggle-log-drawer', () => callback());
  },
  writeXmpFile: (filePath, xmpContent) => ipcRenderer.invoke('write-xmp-file', filePath, xmpContent),
  selectAndScanFolder: () => ipcRenderer.invoke('read-folder-files'),
  launchLightroom: (folderPath) => ipcRenderer.invoke('launch-lightroom', folderPath),
  onAuthCallback: (callback) => {
    ipcRenderer.on('auth-callback', (_event, sessionData) => callback(sessionData));
  },
});
