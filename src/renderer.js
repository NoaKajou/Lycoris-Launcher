
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
    // Si un compte a été utilisé en dernier, on le sélectionne
    if (lastAccountUUID) {
      const acc = accounts.find(a => a.uuid === lastAccountUUID);
      if (acc) currentAccount = acc;
      window.currentAccount = currentAccount;
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
        <img src="${acc.avatar}" alt="skin" class="user-head">
        <span class="user-name">${acc.username}</span>
        <button class="delete-account-btn" title="Supprimer ce compte">✕</button>
      `;
      // Connexion rapide sur clic sur l'item (hors bouton delete)
      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-account-btn')) return;
        closePanel();
        msStatus.textContent = 'Connexion au compte...';
        try {
          const accData = await window.electronAPI.switchAccount(acc.uuid);
          currentAccount = accData;
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
        playerBtn.innerHTML = `<img src="${acc.avatar}" alt="skin" class="user-head"><span class="user-name">${acc.username}</span>`;
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

  if (playerBtn) {
    playerBtn.addEventListener('click', openPanel);
  }

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
