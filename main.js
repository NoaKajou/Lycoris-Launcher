// Dépendances principales (doivent être chargées AVANT toute utilisation)

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { loadKey } = require('./keyManager');
const { encryptJSON, decryptJSON } = require('./cryptoUtils');

// Vérifie si le accessToken est expiré
function isTokenExpired(account) {
  if (!account.expiresAt) return true;
  return new Date(account.expiresAt) < new Date();
}

// Rafraîchit le accessToken avec le refreshToken
async function refreshAccessToken(account) {
  const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: REDIRECT_URI,
      scope: 'XboxLive.signin offline_access openid profile'
    })
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(data.error_description || 'Impossible de refresh le token');
  account.accessToken = data.access_token;
  account.refreshToken = data.refresh_token;
  account.expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  // Mets à jour le compte dans accounts.json
  let accounts = loadAccounts();
  const idx = accounts.findIndex(acc => acc.uuid === account.uuid);
  if (idx !== -1) accounts[idx] = account;
  else accounts.push(account);
  saveAccounts(accounts);
  return account;
}

// IPC pour récupérer tous les comptes (pour le renderer)
ipcMain.handle('get-accounts', async () => {
  return loadAccounts();
});

// IPC pour switcher de compte (refresh auto si besoin)
ipcMain.handle('switch-account', async (event, uuid) => {
  let accounts = loadAccounts();
  const acc = accounts.find(a => a.uuid === uuid);
  if (!acc) throw new Error('Compte introuvable');
  if (isTokenExpired(acc)) {
    try {
      await refreshAccessToken(acc);
    } catch (e) {
      throw new Error('Refresh token échoué : ' + e.message);
    }
  }
  return acc;
});

require('dotenv').config();

// Pour la gestion des comptes persistants

let ACCOUNTS_PATH;
let LAST_ACCOUNT_PATH;
let ENCRYPTED = true; // Active le chiffrement
let key;



// Initialisation unique de la fenêtre principale et de l'auto-login
app.whenReady().then(async () => {
  ACCOUNTS_PATH = path.join(app.getPath('userData'), 'accounts.json');
  LAST_ACCOUNT_PATH = path.join(app.getPath('userData'), 'lastAccount.json');
  key = loadKey();
  if (ENCRYPTED) {
    console.log('[SECURE] Le chiffrement AES des comptes est ACTIVÉ.');
  } else {
    console.log('[SECURE] Le chiffrement AES des comptes est DÉSACTIVÉ.');
  }
  // Crée le fichier s'il n'existe pas ou s'il est vide
  try {
    if (!fs.existsSync(ACCOUNTS_PATH) || fs.readFileSync(ACCOUNTS_PATH, 'utf-8').trim() === '') {
      if (ENCRYPTED) {
        fs.writeFileSync(ACCOUNTS_PATH, encryptJSON([], key), 'utf-8');
      } else {
        fs.writeFileSync(ACCOUNTS_PATH, '[]', 'utf-8');
      }
    }
  } catch (e) {
    console.error('Impossible d\'initialiser accounts.json :', e);
  }

  // Auto-login: tente de rafraîchir le dernier compte utilisé (si dispo)
  let accounts = loadAccounts();
  let lastAccountUUID = null;
  try {
    if (fs.existsSync(LAST_ACCOUNT_PATH)) {
      lastAccountUUID = JSON.parse(fs.readFileSync(LAST_ACCOUNT_PATH, 'utf-8')).uuid;
    }
  } catch (e) {
    console.warn('Impossible de lire lastAccount.json:', e);
  }
  let acc = null;
  if (lastAccountUUID) {
    acc = accounts.find(a => a.uuid === lastAccountUUID && a.refreshToken);
  }
  if (!acc) {
    acc = accounts.find(a => a.refreshToken);
  }
  if (acc) {
    // Debug désactivé : ne plus log le refresh_token
    try {
      const refreshed = await refreshAccessToken(acc);
      createWindow();
      if (win) {
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('ms-login-success', refreshed);
          win.webContents.send('ms-login-status', `Auto-connected: ${refreshed.username}`);
        });
      }
      return;
    } catch (e) {
      console.warn('Auto-login failed:', e.message);
    }
  } else {
    // Debug désactivé : aucun compte avec refresh_token trouvé
  }
  createWindow();
});

// IPC pour sauvegarder l'UUID du dernier compte utilisé
ipcMain.on('set-last-account', (event, uuid) => {
  try {
    fs.writeFileSync(LAST_ACCOUNT_PATH, JSON.stringify({ uuid }), 'utf-8');
  } catch (e) {
    console.warn('Impossible d\'écrire lastAccount.json:', e);
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function loadAccounts() {
  try {
    const raw = fs.readFileSync(ACCOUNTS_PATH, 'utf-8');
    if (ENCRYPTED) {
      return decryptJSON(raw, key);
    } else {
      return JSON.parse(raw);
    }
  } catch (e) {
    return [];
  }
}
function saveAccounts(accounts) {
  if (ENCRYPTED) {
    fs.writeFileSync(ACCOUNTS_PATH, encryptJSON(accounts, key), 'utf-8');
  } else {
    fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
  }
}



require('dotenv').config();
// fetch compatible node
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

// Ajoute un handler pour refresh avec un refresh_token
ipcMain.on('refresh-with-token', async (event, { refresh_token }) => {
  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        refresh_token,
        redirect_uri: REDIRECT_URI,
        grant_type: 'refresh_token',
        scope: 'XboxLive.signin offline_access openid profile'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      event.sender.send('ms-login-status', 'Erreur lors du refresh Microsoft : ' + (tokenData.error_description || JSON.stringify(tokenData)));
      return;
    }
    // Authentification Xbox Live
    const xboxRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${tokenData.access_token}`
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      })
    });
    const xboxData = await xboxRes.json();
    if (!xboxData.Token) {
      event.sender.send('ms-login-status', 'Erreur Xbox Live.');
      return;
    }
    // Authentification XSTS
    const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xboxData.Token]
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      })
    });
    const xstsData = await xstsRes.json();
    if (!xstsData.Token) {
      event.sender.send('ms-login-status', 'Erreur XSTS.');
      return;
    }
    // Authentification Minecraft
    const mcRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${xstsData.DisplayClaims.xui[0].uhs};${xstsData.Token}`
      })
    });
    const mcData = await mcRes.json();
    if (!mcData.access_token) {
      event.sender.send('ms-login-status', 'Erreur Minecraft : ' + (mcData.errorMessage || mcData.error || JSON.stringify(mcData)));
      return;
    }
    // Récupère le profil Minecraft
    const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { Authorization: `Bearer ${mcData.access_token}` }
    });
    if (profileRes.status !== 200) {
      event.sender.send('ms-login-status', 'Aucun compte Minecraft trouvé sur ce compte Microsoft.');
      return;
    }
    const profile = await profileRes.json();
    // Log si le refresh_token est absent
    if (!tokenData.refresh_token) {
      console.warn('[WARN] Aucun refresh_token reçu pour', profile.name, profile.id);
    }
    event.sender.send('ms-login-success', {
      username: profile.name,
      uuid: profile.id,
      avatar: `https://mc-heads.net/avatar/${profile.id}/32`,
      refresh_token: tokenData.refresh_token || ''
    });
    event.sender.send('ms-login-status', `Connecté : ${profile.name}`);
  } catch (e) {
    event.sender.send('ms-login-status', 'Erreur lors du refresh : ' + e.message);
  }
});


let win;
function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 520,
    frame: false, // Supprime la barre de titre native (toolbar)
    autoHideMenuBar: true, // Cache le menu natif
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false); // Assure que le menu est caché
  win.loadFile('src/index.html');
}


// Charge les variables d'environnement depuis .env
require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const OAUTH_URL = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=XboxLive.signin%20offline_access%20openid%20profile&prompt=select_account`;

ipcMain.on('ms-login', async (event) => {
  // Ouvre la fenêtre de login Microsoft
  let accounts = loadAccounts();
  let loginCompleted = false;
  let authWin = new BrowserWindow({
    backgroundColor: '#222222',
    frame: true,
    width: 520,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  authWin.loadURL(OAUTH_URL);

  // Affiche une erreur si la page ne charge pas
  authWin.webContents.on('did-fail-load', (event2, errorCode, errorDescription, validatedURL) => {
    authWin.loadURL('data:text/html,<h2 style="color:red;font-family:sans-serif">Erreur de chargement de la page Microsoft : ' + errorDescription + '</h2><p>URL : ' + validatedURL + '</p>');
  });

  // Démarre un serveur local pour capter le code
  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/auth' && reqUrl.query.code) {
      res.end('<html><body>Connexion réussie, vous pouvez fermer cette fenêtre.</body></html>');
      setTimeout(() => {
        authWin.close();
        try { server.close(); } catch (e) {}
      }, 1000);

      // Échange le code contre un access token Microsoft
      try {
        const tokenRes = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            code: reqUrl.query.code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
            scope: 'XboxLive.signin offline_access openid profile'
          })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          event.sender.send('ms-login-status', 'Erreur lors de la récupération du token Microsoft : ' + (tokenData.error_description || JSON.stringify(tokenData)));
          return;
        }

        // Authentification Xbox Live
        const xboxRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Properties: {
              AuthMethod: 'RPS',
              SiteName: 'user.auth.xboxlive.com',
              RpsTicket: `d=${tokenData.access_token}`
            },
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT'
          })
        });
        const xboxData = await xboxRes.json();
        if (!xboxData.Token) {
          event.sender.send('ms-login-status', 'Erreur Xbox Live.');
          return;
        }

        // Authentification XSTS
        const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Properties: {
              SandboxId: 'RETAIL',
              UserTokens: [xboxData.Token]
            },
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT'
          })
        });
        const xstsData = await xstsRes.json();
        if (!xstsData.Token) {
          event.sender.send('ms-login-status', 'Erreur XSTS.');
          return;
        }

        // Authentification Minecraft
        const mcRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identityToken: `XBL3.0 x=${xstsData.DisplayClaims.xui[0].uhs};${xstsData.Token}`
          })
        });
        const mcData = await mcRes.json();
        if (!mcData.access_token) {
          event.sender.send('ms-login-status', 'Erreur Minecraft : ' + (mcData.errorMessage || mcData.error || JSON.stringify(mcData)));
          return;
        loginCompleted = true;
        }

        // Récupère le profil Minecraft
        const profileRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
          headers: { Authorization: `Bearer ${mcData.access_token}` }
        });
        if (profileRes.status !== 200) {
          event.sender.send('ms-login-status', 'Aucun compte Minecraft trouvé sur ce compte Microsoft.');
          return;
        }
        const profile = await profileRes.json();
        // Calcule expiresAt
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        // Met à jour ou ajoute le compte
        const idx = accounts.findIndex(acc => acc.uuid === profile.id);
        const newAcc = {
          username: profile.name,
          uuid: profile.id,
          avatar: `https://mc-heads.net/avatar/${profile.id}/32`,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          expiresAt
        };
        if (!tokenData.refresh_token) {
          console.warn('[WARN] Aucun refresh_token reçu pour', profile.name, profile.id);
        }
        if (idx !== -1) {
          accounts[idx] = newAcc;
        } else {
          accounts.push(newAcc);
        }
        saveAccounts(accounts);
        loginCompleted = true;
        event.sender.send('ms-login-success', newAcc);
        event.sender.send('ms-login-status', `Connecté : ${profile.name}`);
      } catch (e) {
        event.sender.send('ms-login-status', 'Erreur lors de la connexion : ' + e.message);
      }
    } else if (reqUrl.pathname === '/auth' && reqUrl.query.error) {
      // L'utilisateur a explicitement refusé ou annulé la connexion
      res.end('<html><body>Connexion annulée. Vous pouvez fermer cette fenêtre.</body></html>');
      setTimeout(() => {
        authWin.close();
        try { server.close(); } catch (e) {}
        event.sender.send('ms-login-status', 'Connexion annulée ou refusée.');
      }, 1000);
    } else {
      res.end('');
    }
  });
  server.listen(3000);

  // Détecte la fermeture de la fenêtre de login
  authWin.on('closed', () => {
    if (!loginCompleted) {
      try { server.close(); } catch (e) {}
      event.sender.send('ms-login-status', 'Connexion annulée ou fermée.');
    }
  });
});

ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});
ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on('window-close', () => {
  if (win) win.close();
});

// Suppression d'un compte (synchronisée)
ipcMain.handle('delete-account', async (event, uuid) => {
  let accounts = loadAccounts();
  accounts = accounts.filter(acc => acc.uuid !== uuid);
  saveAccounts(accounts);

  return accounts;
});


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
