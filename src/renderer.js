window.addEventListener('DOMContentLoaded', () => {
  // Fonction utilitaire pour récupérer l'UUID Mojang à partir du username
  async function getUUID(username) {
    try {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.id;
    } catch (e) {
      return null;
    }
  }

  const minBtn = document.querySelector('.win-min');
  const maxBtn = document.querySelector('.win-max');
  const closeBtn = document.querySelector('.win-close');
  if (minBtn) minBtn.addEventListener('click', () => window.electronAPI.minimize());
  if (maxBtn) maxBtn.addEventListener('click', () => window.electronAPI.maximize());
  if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.close());

  const headUrl = (uuid) => `https://crafatar.com/renders/head/${uuid}`;
  const headFallbackUrl = (uuid) => `https://mc-heads.net/avatar/${uuid}/64`;

  // Multi-comptes avec panneau latéral
  const msBtn = document.getElementById('ms-login-btn');
  const msStatus = document.getElementById('ms-login-status');
  const panel = document.getElementById('accounts-panel');
  const closePanelBtn = document.getElementById('close-accounts-panel');
  const accountsList = document.getElementById('accounts-list');
  const addAccountBtn = document.getElementById('add-account-btn');
  const playerBtn = document.getElementById('player-btn');
  // Nouvelle gestion : tout vient du backend (main process)
  let accounts = [];
  let currentAccount = null;
  // Expose globalement pour d'autres pages/scripts
  Object.defineProperty(window, 'currentAccount', {
    get: () => currentAccount,
    set: v => { currentAccount = v; },
    configurable: true
  });
  // Restaure le dernier compte utilisé depuis localStorage
  const lastAccountUUID = localStorage.getItem('lastAccountUUID');

  async function loadAccountsFromBackend() {
    accounts = await window.electronAPI.getAccounts();
    // Migration automatique des comptes sans UUID ou UUID trop court
    let migrated = false;
    for (const acc of accounts) {
      if (!acc.uuid || acc.uuid.length < 16) {
        const uuid = await getUUID(acc.username);
        if (uuid) {
          acc.uuid = uuid;
          acc.avatar = headUrl(uuid);
          migrated = true;
        }
      }
      // Normalise l'URL d'avatar vers le head render même si déjà présent
      if (acc.uuid) {
        acc.avatar = headUrl(acc.uuid);
      }
    }
    if (migrated && window.electronAPI.saveAccounts) {
      // Si une API de sauvegarde existe côté main, on l'appelle pour persister la migration
      await window.electronAPI.saveAccounts(accounts);
    }
    // Si un compte a été utilisé en dernier, on le sélectionne
    if (lastAccountUUID) {
      const acc = accounts.find(a => a.uuid === lastAccountUUID);
      if (acc) currentAccount = acc;
      window.currentAccount = currentAccount;
      // Recharge le skin si la fonction existe
      if (typeof window.forceReloadCurrentAccountSkin === 'function' && currentAccount) {
        window.forceReloadCurrentAccountSkin(currentAccount);
      }
    }
    renderAccountsPanel();
    renderPlayerBtn();
  }

  async function renderAccountsPanel() {
    accountsList.innerHTML = '';
    accounts.forEach((acc) => {
      const item = document.createElement('div');
      item.className = 'account-item';
      item.innerHTML = `
        <img src="${headUrl(acc.uuid)}" alt="skin" class="user-head">
        <span class="user-name">${acc.username}</span>
        <button class="delete-account-btn" title="Supprimer ce compte">✕</button>
      `;
      const imgEl = item.querySelector('img');
      imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = headFallbackUrl(acc.uuid); };
      // Connexion rapide sur clic sur l'item (hors bouton delete)
      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-account-btn')) return;
        closePanel();
        msStatus.textContent = 'Connexion au compte...';
        try {
          const accData = await window.electronAPI.switchAccount(acc.uuid);
          currentAccount = accData;
          window.currentAccount = currentAccount; // always update global
          // Recharge le skin si la fonction existe
          if (typeof window.forceReloadCurrentAccountSkin === 'function' && currentAccount) {
            window.forceReloadCurrentAccountSkin(currentAccount);
          }
          // Sauvegarde l'UUID du compte utilisé côté main process
          window.electronAPI.setLastAccount && window.electronAPI.setLastAccount(accData.uuid);
          msStatus.textContent = `Connecté : ${accData.username}`;
          renderPlayerBtn();
        } catch (err) {
          msStatus.textContent = 'Erreur lors du switch : ' + err.message;
        }
      });
      // Suppression du compte (nécessite une IPC à ajouter côté main.js si on veut vraiment supprimer côté backend)
      item.querySelector('.delete-account-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        // Suppression synchronisée avec le backend
        try {
          accounts = await window.electronAPI.deleteAccount(acc.uuid);
          renderAccountsPanel();
          renderPlayerBtn();
          msStatus.textContent = 'Compte supprimé.';
        } catch (err) {
          msStatus.textContent = 'Erreur lors de la suppression : ' + err.message;
        }
      });
      accountsList.appendChild(item);
    });
  }

  function renderPlayerBtn() {
    // Supprime complètement le bouton joueur du DOM si aucun compte n'est connecté
    if (accounts.length > 0 && (currentAccount || accounts[accounts.length - 1])) {
      const acc = currentAccount || accounts[accounts.length - 1];
      if (acc && acc.username && acc.avatar) {
        const avatarSrc = headUrl(acc.uuid || '') || acc.avatar;
        console.log('[AVATAR][renderer] avatar utilisé :', avatarSrc && avatarSrc.substring(0, 80), avatarSrc && avatarSrc.startsWith('data:image/png') ? '(data URL)' : avatarSrc);

        // Reconstruit le contenu sans handlers inline (CSP compliant)
        playerBtn.textContent = '';
        const imgEl = document.createElement('img');
        imgEl.className = 'user-head';
        imgEl.alt = 'skin';
        imgEl.onerror = () => {
          imgEl.onerror = null;
          if (acc.uuid) imgEl.src = headFallbackUrl(acc.uuid);
        };
        imgEl.src = avatarSrc;

        const nameEl = document.createElement('span');
        nameEl.className = 'user-name';
        nameEl.textContent = acc.username;

        playerBtn.appendChild(imgEl);
        playerBtn.appendChild(nameEl);
        playerBtn.style.display = 'flex';
        msBtn.style.display = 'none';
        if (!playerBtn.parentNode) {
          // Si le bouton a été supprimé, on le remet
          document.querySelector('.lycoris-account').insertBefore(playerBtn, msBtn);
        }
      } else {
        if (playerBtn.parentNode) playerBtn.parentNode.removeChild(playerBtn);
        msBtn.style.display = '';
      }
    } else {
      if (playerBtn.parentNode) playerBtn.parentNode.removeChild(playerBtn);
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
      if (status && status.toLowerCase().includes('annulée')) {
        // Réinitialise l'UI si l'utilisateur annule ou ferme la fenêtre de login
        msBtn.style.display = '';
        playerBtn.style.display = 'none';
      }
    });
    window.electronAPI.onMsLoginSuccess((data) => {
      // Ajoute ou met à jour le compte dans la liste
      const idx = accounts.findIndex(acc => acc.uuid === data.uuid);
      if (idx !== -1) {
        accounts[idx] = data;
      } else {
        accounts.push(data);
      }
      // Debug désactivé : ne plus log le refresh_token
      // Suppression de l'alerte si le refresh_token est manquant
      if (data.uuid && data.refresh_token) {
        refreshTokens[data.uuid] = data.refresh_token;
      }
      // Définit ce compte comme courant et sauvegarde l'UUID côté main process
      currentAccount = data;
      window.currentAccount = currentAccount;
      window.electronAPI.setLastAccount && window.electronAPI.setLastAccount(data.uuid);
      renderAccountsPanel();
      renderPlayerBtn();
      // n'ouvre plus le panneau automatiquement
    });
    window.electronAPI.onMsLoginRefreshToken && window.electronAPI.onMsLoginRefreshToken((data) => {
      if (data.uuid && data.refresh_token) {
        refreshTokens[data.uuid] = data.refresh_token;
      }
    });
  }

  // --- Gestion du panneau des comptes ---

  // 1. Toggle du panneau via le bouton joueur
  if (playerBtn) {
    playerBtn.addEventListener('click', (e) => {
      // On empêche la propagation pour que le clic ne soit pas capté par le handler global (fermeture)
      e.stopPropagation();
      if (panel.classList.contains('open')) {
        closePanel(); // Si déjà ouvert, on ferme
      } else {
        openPanel(); // Sinon, on ouvre
      }
    });
  }

  // 2. Ferme le panneau si on clique ailleurs que sur le panel ou le bouton joueur
  document.addEventListener('mousedown', (e) => {
    // Si le panneau est ouvert
    if (panel.classList.contains('open')) {
      // Si le clic n'est ni dans le panel, ni sur le bouton joueur
      if (!panel.contains(e.target) && !playerBtn.contains(e.target)) {
        closePanel();
      }
    }
  });

  // Chargement initial depuis le backend
  loadAccountsFromBackend();

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
