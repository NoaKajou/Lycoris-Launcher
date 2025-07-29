const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  msLogin: () => ipcRenderer.send('ms-login'),
  refreshWithToken: (data) => ipcRenderer.send('refresh-with-token', data),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  switchAccount: (uuid) => ipcRenderer.invoke('switch-account', uuid),
  onMsAuthCode: (callback) => ipcRenderer.on('ms-auth-code', (event, code) => callback(code)),
  onMsLoginStatus: (callback) => ipcRenderer.on('ms-login-status', (event, status) => callback(status)),
  onMsLoginSuccess: (callback) => ipcRenderer.on('ms-login-success', (event, data) => callback(data)),
  onMsLoginRefreshToken: (callback) => ipcRenderer.on('ms-login-refresh-token', (event, data) => callback(data)),
  deleteAccount: (uuid) => ipcRenderer.invoke('delete-account', uuid),
  setLastAccount: (uuid) => ipcRenderer.send('set-last-account', uuid)
});
