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
  launchLightroom: (folderPath) => ipcRenderer.invoke('launch-lightroom', folderPath),
});
