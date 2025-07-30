// js/nav.js
// Gère la navigation active dans l'en-tête

let currentPage = 'play';
function setActiveNav(page) {
  document.getElementById('btn-play').classList.remove('active');
  document.getElementById('btn-mods').classList.remove('active');
  document.getElementById('btn-skins').classList.remove('active');
  if(page === 'play') document.getElementById('btn-play').classList.add('active');
  if(page === 'mods') document.getElementById('btn-mods').classList.add('active');
  if(page === 'skins') document.getElementById('btn-skins').classList.add('active');
  currentPage = page;
}

// Ajoute les écouteurs de clic pour chaque bouton
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-play').addEventListener('click', () => setActiveNav('play'));
  document.getElementById('btn-mods').addEventListener('click', () => setActiveNav('mods'));
  document.getElementById('btn-skins').addEventListener('click', () => setActiveNav('skins'));
  setActiveNav(currentPage);
});
