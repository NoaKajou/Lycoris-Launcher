console.log('Renderer prêt !');

window.addEventListener('DOMContentLoaded', () => {
  const minBtn = document.querySelector('.win-min');
  const maxBtn = document.querySelector('.win-max');
  const closeBtn = document.querySelector('.win-close');
  if (minBtn) minBtn.addEventListener('click', () => window.electronAPI.minimize());
  if (maxBtn) maxBtn.addEventListener('click', () => window.electronAPI.maximize());
  if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.close());

  // Multi-comptes avec panneau latéral
  const msBtn = document.getElementById('ms-login-btn');
  const msStatus = document.getElementById('ms-login-status');
  const panel = document.getElementById('accounts-panel');
  const closePanelBtn = document.getElementById('close-accounts-panel');
  const accountsList = document.getElementById('accounts-list');
  const addAccountBtn = document.getElementById('add-account-btn');
  const playerBtn = document.getElementById('player-btn');
  // Chargement des comptes et tokens depuis localStorage
  let accounts = [];
  let refreshTokens = {};
  try {
    const savedAccounts = localStorage.getItem('accounts');
    const savedTokens = localStorage.getItem('refreshTokens');
    if (savedAccounts) accounts = JSON.parse(savedAccounts);
    if (savedTokens) refreshTokens = JSON.parse(savedTokens);
  } catch (e) {
    accounts = [];
    refreshTokens = {};
  }
  function saveAccounts() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('refreshTokens', JSON.stringify(refreshTokens));
  }

  function renderAccountsPanel() {
    accountsList.innerHTML = '';
    accounts.forEach((acc, idx) => {
      const item = document.createElement('div');
      item.className = 'account-item';
      // Affichage debug refresh_token
      const debugToken = refreshTokens[acc.uuid] || acc.refresh_token;
      item.innerHTML = `
        <img src="${acc.avatar}" alt="skin" class="user-head">
        <span class="user-name">${acc.username}</span>
        <button class="delete-account-btn" title="Supprimer ce compte">✕</button>
        <span class="debug-refresh-token" style="font-size:0.7em;color:#e67e22;word-break:break-all;display:none"></span>
      `;
      // Connexion rapide sur clic sur l'item (hors bouton delete)
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-account-btn')) return;
        closePanel();
        const uuid = acc.uuid;
        const refresh_token = refreshTokens[uuid] || acc.refresh_token;
        // Debug affichage
        const debugSpan = item.querySelector('.debug-refresh-token');
        debugSpan.style.display = 'block';
        debugSpan.textContent = refresh_token ? `refresh_token: ${refresh_token.slice(0,16)}...` : 'Aucun refresh_token';
        console.log('[DEBUG] Switch vers', acc.username, 'uuid:', uuid, 'refresh_token:', refresh_token);
        if (refresh_token) {
          msStatus.textContent = 'Connexion automatique...';
          window.electronAPI.refreshWithToken({ refresh_token });
        } else {
          msStatus.textContent = 'Aucun refresh_token, ouverture Microsoft...';
          window.electronAPI.msLogin();
        }
      });
      // Suppression du compte
      item.querySelector('.delete-account-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        accounts.splice(idx, 1);
        if (refreshTokens[acc.uuid]) delete refreshTokens[acc.uuid];
        saveAccounts();
        renderAccountsPanel();
        renderPlayerBtn();
      });
      accountsList.appendChild(item);
    });
  }

  function renderPlayerBtn() {
    if (accounts.length > 0) {
      const acc = accounts[accounts.length - 1];
      playerBtn.innerHTML = `<img src="${acc.avatar}" alt="skin" class="user-head"><span class="user-name">${acc.username}</span>`;
      playerBtn.style.display = 'flex';
      msBtn.style.display = 'none';
    } else {
      playerBtn.style.display = 'none';
      msBtn.style.display = '';
    }
  }

  // Ouvre le panneau en cliquant sur le bouton joueur
  function openPanel() {
    panel.classList.add('open');
  }
  function closePanel() {
    panel.classList.remove('open');
  }

  if (msBtn) {
    msBtn.addEventListener('click', () => {
      msStatus.textContent = 'Ouverture de la connexion Microsoft...';
      window.electronAPI.msLogin();
    });
    window.electronAPI.onMsLoginStatus((status) => {
      msStatus.textContent = status;
      console.log('[DEBUG] ms-login-status:', status);
    });
    window.electronAPI.onMsLoginSuccess((data) => {
      // Ajoute ou met à jour le compte dans la liste
      const idx = accounts.findIndex(acc => acc.uuid === data.uuid);
      if (idx !== -1) {
        accounts[idx] = data;
      } else {
        accounts.push(data);
      }
      // Debug : log le refresh_token reçu
      console.log('[DEBUG] onMsLoginSuccess:', data.username, 'uuid:', data.uuid, 'refresh_token:', data.refresh_token);
      if (!data.refresh_token) {
        alert('Alerte : Le refresh_token est manquant pour ce compte !\nLa reconnexion automatique ne fonctionnera pas.\nReconnecte-toi ou vérifie la configuration côté main.js.');
      }
      if (data.uuid && data.refresh_token) {
        refreshTokens[data.uuid] = data.refresh_token;
      }
      saveAccounts();
      renderAccountsPanel();
      renderPlayerBtn();
      // n'ouvre plus le panneau automatiquement
    });
    window.electronAPI.onMsLoginRefreshToken && window.electronAPI.onMsLoginRefreshToken((data) => {
      if (data.uuid && data.refresh_token) {
        refreshTokens[data.uuid] = data.refresh_token;
        saveAccounts();
      }
    });
  }

  if (playerBtn) {
    playerBtn.addEventListener('click', openPanel);
  }

  // Affiche le bon bouton au chargement (si tu veux persister les comptes, il faudra adapter ici)
  renderAccountsPanel();
  renderPlayerBtn();

  // Bouton pour fermer le panneau
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', closePanel);
  }

  // Bouton pour ajouter un autre compte
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      closePanel();
      msStatus.textContent = '';
      msBtn.style.display = '';
      playerBtn.style.display = 'none';
      window.electronAPI.msLogin();
    });
  }
});
