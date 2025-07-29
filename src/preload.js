const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  msLogin: () => ipcRenderer.send('ms-login'),
  refreshWithToken: (data) => ipcRenderer.send('refresh-with-token', data),
  onMsAuthCode: (callback) => ipcRenderer.on('ms-auth-code', (event, code) => callback(code)),
  onMsLoginStatus: (callback) => ipcRenderer.on('ms-login-status', (event, status) => callback(status)),
  onMsLoginSuccess: (callback) => ipcRenderer.on('ms-login-success', (event, data) => callback(data)),
  onMsLoginRefreshToken: (callback) => ipcRenderer.on('ms-login-refresh-token', (event, data) => callback(data))
});
