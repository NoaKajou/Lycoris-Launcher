console.log('Renderer prêt !');

window.addEventListener('DOMContentLoaded', () => {
  const minBtn = document.querySelector('.win-min');
  const maxBtn = document.querySelector('.win-max');
  const closeBtn = document.querySelector('.win-close');
  if (minBtn) minBtn.addEventListener('click', () => window.electronAPI.minimize());
  if (maxBtn) maxBtn.addEventListener('click', () => window.electronAPI.maximize());
  if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.close());

  // Microsoft login
  const msBtn = document.getElementById('ms-login-btn');
  const msStatus = document.getElementById('ms-login-status');
  if (msBtn) {
    msBtn.addEventListener('click', () => {
      msStatus.textContent = 'Ouverture de la connexion Microsoft...';
      window.electronAPI.msLogin();
    });
    window.electronAPI.onMsLoginStatus((status) => {
      msStatus.textContent = status;
    });
  }
});
