window.loadPage = async function(pageName) {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';
  // Active le bouton courant
  const navBtns = document.querySelectorAll('.spa-btn');
  navBtns.forEach((btn, idx) => {
    btn.classList.remove('active');
    if (
      (pageName === 'launcher' && idx === 0) ||
      (pageName === 'skins' && idx === 1) ||
      (pageName === 'mods' && idx === 2)
    ) btn.classList.add('active');
  });
  try {
    const res = await fetch(`pages/${pageName}.html`);
    const html = await res.text();
    document.getElementById('content').innerHTML = html;
    // Charger le JS spécifique à la page
    const script = document.createElement('script');
    script.src = `js/${pageName}.js`;
    script.onload = () => { if (loader) loader.style.display = 'none'; };
    document.body.appendChild(script);
  } catch (e) {
    document.getElementById('content').innerHTML = '<p>Erreur de chargement.</p>';
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation SPA : attache les listeners sur les boutons
  const navBtns = document.querySelectorAll('nav button');
  navBtns.forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      const page = idx === 0 ? 'launcher' : idx === 1 ? 'skins' : 'mods';
      window.loadPage(page);
    });
  });
  window.loadPage('launcher');
});
