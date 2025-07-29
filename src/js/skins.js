// Logique pour afficher le skin et les capes
window.addEventListener('DOMContentLoaded', async () => {
  // Exemple d'appel à l'API Electron pour récupérer le skin et les capes
  if (window.electronAPI && window.electronAPI.getAccounts) {
    const accounts = await window.electronAPI.getAccounts();
    if (accounts && accounts[0]) {
      const uuid = accounts[0].uuid;
      document.getElementById('skin-img').src = `https://mc-heads.net/body/${uuid}`;
      // Capes fictives pour l'exemple
      const capes = ["Minecon 2016", "Migrator"];
      const capesList = document.getElementById('capes-list');
      capesList.innerHTML = capes.map(c => `<li>${c}</li>`).join('');
    }
  }
});
