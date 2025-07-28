const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  msLogin: () => ipcRenderer.send('ms-login'),
  onMsAuthCode: (callback) => ipcRenderer.on('ms-auth-code', (event, code) => callback(code)),
  onMsLoginStatus: (callback) => ipcRenderer.on('ms-login-status', (event, status) => callback(status))
});
