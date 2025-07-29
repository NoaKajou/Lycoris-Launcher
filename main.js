
// Dépendances principales (doivent être chargées AVANT toute utilisation)
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Pour la gestion des comptes persistants
let ACCOUNTS_PATH;
app.whenReady().then(() => {
  ACCOUNTS_PATH = path.join(app.getPath('userData'), 'accounts.json');
});

function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf-8'));
  } catch (e) {
    return [];
  }
}
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
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
    event.sender.send('ms-login-success', {
      username: profile.name,
      uuid: profile.id,
      avatar: `https://mc-heads.net/avatar/${profile.id}/32`,
      refresh_token: tokenData.refresh_token
    });
    event.sender.send('ms-login-status', `Connecté : ${profile.name}`);
  } catch (e) {
    event.sender.send('ms-login-status', 'Erreur lors du refresh : ' + e.message);
  }
});


let win;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
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
        server.close();
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
          refreshToken: tokenData.refresh_token,
          expiresAt
        };
        if (idx !== -1) {
          accounts[idx] = newAcc;
        } else {
          accounts.push(newAcc);
        }
        saveAccounts(accounts);
        event.sender.send('ms-login-success', newAcc);
        event.sender.send('ms-login-status', `Connecté : ${profile.name}`);
      } catch (e) {
        event.sender.send('ms-login-status', 'Erreur lors de la connexion : ' + e.message);
      }
    } else {
      res.end('');
    }
  });
  server.listen(3000);
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
