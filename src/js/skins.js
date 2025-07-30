// Logique skinview3d pour la page skins.html (SPA)
// Exécution immédiate pour compatibilité SPA (pas d'attente DOMContentLoaded)
(async () => {
  // Charge skinview3d dynamiquement si absent (SPA)
  // Charge skinview3d localement (CSP Electron)
  async function ensureSkinview3d() {
    if (window.skinview3d) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/skinview3d.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  await ensureSkinview3d();
  console.debug('skinview3d global:', window.skinview3d);
  // Attendre que le canvas et les selects existent (SPA)
  const waitForElm = (selector) => new Promise(resolve => {
    if (document.querySelector(selector)) return resolve(document.querySelector(selector));
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await waitForElm('#skinCanvas');
  await waitForElm('#modelSelect');

  let viewer;
  function getUUID() {
    if (window.currentAccount && window.currentAccount.uuid) return window.currentAccount.uuid;
    if (window.accounts && window.accounts.length > 0) return window.accounts[0].uuid;
    if (localStorage.getItem('lastAccountUUID')) return localStorage.getItem('lastAccountUUID');
    return null;
  }

  async function loadSkin(uuid, model = "default", capeUrl = null) {
    if (!uuid) return;
    try {
      const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      const data = await res.json();
      const base64 = data.properties[0].value;
      const decoded = JSON.parse(atob(base64));
      let skinUrl = decoded.textures.SKIN?.url;
      if (skinUrl && skinUrl.startsWith('http://')) skinUrl = skinUrl.replace('http://', 'https://');
      if (capeUrl && capeUrl.startsWith('http://')) capeUrl = capeUrl.replace('http://', 'https://');

      if (!viewer) {
        viewer = new skinview3d.SkinViewer({
          canvas: document.getElementById("skinCanvas"),
          width: 300,
          height: 400,
          skin: skinUrl,
          model: model
        });
        viewer.controls.enableZoom = false;
        viewer.controls.enableRotate = true;
        // Pas d'animation : personnage statique
      } else {
        viewer.loadSkin(skinUrl, model);
      }
      if (capeUrl) {
        viewer.loadCape(capeUrl);
      } else {
        viewer.loadCape(null);
      }
    } catch (e) {
      console.error('Erreur chargement skin:', e);
    }
  }

  // Capes fictives (à remplacer par tes vraies URLs dynamiques)


  // Fonction pour charger le skin du compte courant (avec cape Mojang active si dispo)
  function loadCurrentAccountSkin() {
    const uuid = getUUID();
    if (uuid) {
      console.debug('[skins.js] UUID du joueur ciblé :', uuid);
      // Tente de charger la cape Mojang active
      fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
        .then(res => res.json())
        .then(data => {
          const base64 = data.properties[0].value;
          const decoded = JSON.parse(atob(base64));
          let mojangCape = decoded.textures.CAPE?.url;
          if (mojangCape && mojangCape.startsWith('http://')) mojangCape = mojangCape.replace('http://', 'https://');
          loadSkin(uuid, document.getElementById("modelSelect").value, mojangCape || null);
        })
        .catch(() => {
          loadSkin(uuid, document.getElementById("modelSelect").value, null);
        });
    }
  }

  // (Suppression de toute la logique d'affichage des capes)

  // Initialisation
  loadCurrentAccountSkin();

  // Met à jour le skin si le compte courant change dynamiquement
  let lastUUID = getUUID();
  setInterval(() => {
    const currentUUID = getUUID();
    if (currentUUID !== lastUUID) {
      lastUUID = currentUUID;
      loadCurrentAccountSkin();
    }
  }, 1000);

  document.getElementById("modelSelect").addEventListener("change", (e) => {
    loadCurrentAccountSkin();
  });

})();
