// Ce script permet d'injecter dynamiquement l'UUID du joueur connecté dans la page skins.html
// Il doit être inclus dans skins.html après le script renderer.js

document.addEventListener('DOMContentLoaded', () => {
  // Cherche la variable currentAccount (définie dans renderer.js)
  let uuid = null;
  if (window.currentAccount && window.currentAccount.uuid) {
    uuid = window.currentAccount.uuid;
  } else if (window.accounts && window.accounts.length > 0) {
    uuid = window.accounts[0].uuid;
  } else if (localStorage.getItem('lastAccountUUID')) {
    uuid = localStorage.getItem('lastAccountUUID');
  }
  if (uuid) {
    console.debug('[skinview-init] UUID du joueur ciblé :', uuid);
  }
  if (uuid && typeof loadSkin === 'function') {
    // Recharge le skin avec l'UUID du joueur connecté
    loadSkin(uuid);
    // Met à jour les listeners pour utiliser le bon uuid
    document.getElementById("modelSelect").addEventListener("change", (e) => {
      loadSkin(uuid, e.target.value, document.getElementById("capeSelect").value);
    });
    document.getElementById("capeSelect").addEventListener("change", (e) => {
      loadSkin(uuid, document.getElementById("modelSelect").value, e.target.value);
    });
  }
});
