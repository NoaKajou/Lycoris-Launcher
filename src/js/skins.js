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
  await waitForElm('#skinFileInput');
  await waitForElm('#applySkinBtn');
  await waitForElm('#skinStatus');
  await waitForElm('#skinGallery');

  // Ajoute un bouton pour tester le token
  await waitForElm('#testTokenBtn');
  const tokenTestResult = document.getElementById('tokenTestResult');
  document.getElementById('testTokenBtn').addEventListener('click', async () => {
    tokenTestResult.style.display = 'block';
    tokenTestResult.textContent = 'Test du token en cours...';
    const accessToken = getAccessToken();
    console.debug('[DEBUG] currentAccount:', window.currentAccount);
    if (accessToken) {
      console.debug('[DEBUG] accessToken:', accessToken);
    } else {
      console.debug('[DEBUG] Aucun accessToken trouvé');
    }
    if (!accessToken) {
      tokenTestResult.textContent = 'Aucun accessToken trouvé.';
      return;
    }
    try {
      const res = await fetch('https://api.minecraftservices.com/minecraft/profile', {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (res.status === 200) {
        tokenTestResult.textContent = '✅ Token valide : accès au profil Minecraft OK.';
      } else if (res.status === 401) {
        tokenTestResult.textContent = '❌ Token invalide ou expiré (401). Relogue-toi.';
      } else {
        tokenTestResult.textContent = 'Réponse inattendue : ' + res.status;
      }
    } catch (e) {
      tokenTestResult.textContent = 'Erreur lors du test : ' + e.message;
    }
  });

  let viewer;
  function getUUID() {
    if (window.currentAccount && window.currentAccount.uuid) return window.currentAccount.uuid;
    return null;
  }

  function getAccessToken() {
    if (window.currentAccount && window.currentAccount.accessToken) return window.currentAccount.accessToken;
    return null;
  }

  // --- Suppression de la galerie de skins locaux ---
  const skinStatus = document.getElementById('skinStatus');
  // ...existing code...

  // --- Aperçu d'un skin importé (fichier local) ---
  let importedSkinFile = null;
async function loadSkinFromFile(filePathOrBlob, variant) {
  if (!window.skinview3d) return;
  resetViewer(filePathOrBlob, variant || 'default');
}


function resetViewer(skinUrl, model) {
  if (viewer) {
    viewer.dispose?.();
    viewer = null;
  }
  viewer = new skinview3d.SkinViewer({
    canvas: document.getElementById("skinCanvas"),
    width: 300,
    height: 400,
    skin: skinUrl,
    model: model
  });
  viewer.controls.enableZoom = false;
  viewer.controls.enableRotate = true;
  viewer.loadCape(null);
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
    if (skinUrl) {
      skinUrl += `?t=${Date.now()}`;
    }
    resetViewer(skinUrl, model);
  } catch (e) {
    console.error('Erreur chargement skin:', e);
  }
}

  // Capes fictives (à remplacer par tes vraies URLs dynamiques)


  // Fonction pour charger le skin du compte courant (avec cape Mojang active si dispo)
async function loadCurrentAccountSkin() {
  // Attend que le canvas et le select soient prêts
  const canvas = await waitForElm("#skinCanvas");
  const modelSelect = await waitForElm("#modelSelect");
  if (!canvas || !canvas.getContext) {
    console.warn("Canvas non disponible, attente du DOM...");
    return;
  }
  const uuid = getUUID();
  if (uuid) {
    console.debug('[skins.js] UUID du joueur ciblé :', uuid);
    const model = modelSelect?.value || "default";
    loadSkin(uuid, model, null);
  }
}

  // (Suppression de toute la logique d'affichage des capes)




  // Initialisation : preview du skin du compte uniquement si un compte courant existe
  if (window.currentAccount && window.currentAccount.uuid) {
    await loadCurrentAccountSkin();
  }

  // Le bouton joueur n'a plus besoin de recharger le skin, il ouvre juste le panneau



  // Ajoute un listener IPC pour détecter le changement de compte
async function forceReloadCurrentAccountSkin(newAccount) {
  window.currentAccount = newAccount;
  importedSkinFile = null;
  if (viewer) {
    try { viewer.dispose && viewer.dispose(); } catch (e) {}
    viewer = null;
  }
  await loadCurrentAccountSkin();
}

  // Expose la fonction pour le main process ou preload
  window.forceReloadCurrentAccountSkin = forceReloadCurrentAccountSkin;

  if (window.electronAPI && window.electronAPI.onSwitchAccount) {
    window.electronAPI.onSwitchAccount(forceReloadCurrentAccountSkin);
  } else if (window.require) {
    // Fallback pour Electron context bridge non utilisé : écoute l'IPC manuellement
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on('switch-account', (event, newAccount) => {
        if (newAccount && newAccount.uuid) {
          forceReloadCurrentAccountSkin(newAccount);
        }
      });
    } catch (e) {}
  }

  // Preview dynamique uniquement lors d'un changement de modèle
  document.getElementById("modelSelect").addEventListener("change", (e) => {
    if (importedSkinFile) {
      loadSkinFromFile(importedSkinFile, e.target.value);
    } else if (window.currentAccount && window.currentAccount.uuid) {
      loadCurrentAccountSkin();
    }
  });

  // --- Import d'un skin personnalisé ---
  document.getElementById('skinFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.png')) {
      skinStatus.textContent = 'Le fichier doit être un .png';
      return;
    }
    importedSkinFile = file;
    const reader = new FileReader();
    reader.onload = function(evt) {
      loadSkinFromFile(evt.target.result, document.getElementById('modelSelect').value);
      skinStatus.textContent = '';
    };
    reader.readAsDataURL(file);
  });

  // --- Appliquer le skin personnalisé sur le compte Minecraft ---
  document.getElementById('applySkinBtn').addEventListener('click', async () => {
    if (!importedSkinFile) {
      skinStatus.textContent = 'Importe d\'abord un skin .png';
      return;
    }
    const variant = document.getElementById('modelSelect').value;
    const uuid = getUUID();
    const accessToken = getAccessToken();
    if (!uuid || !accessToken) {
      skinStatus.textContent = 'Aucun compte connecté ou accessToken manquant.';
      return;
    }
    skinStatus.textContent = 'Envoi du skin...';
    try {
      const formData = new FormData();
      formData.append('variant', variant);
      formData.append('file', importedSkinFile);
      const res = await fetch('https://api.minecraftservices.com/minecraft/profile/skins', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        },
        body: formData
      });
      if (res.status === 200) {
        skinStatus.textContent = 'Skin appliqué avec succès !';
        // ...existing code...
      } else {
        const err = await res.json().catch(() => ({}));
        skinStatus.textContent = 'Erreur API : ' + (err.errorMessage || err.error || res.status);
      }
    } catch (e) {
      skinStatus.textContent = 'Erreur : ' + e.message;
    }
  });

  // Initialisation des comptes pour la page skins
  if (window.electronAPI && window.electronAPI.getAccounts) {
    try {
      const accounts = await window.electronAPI.getAccounts();
      const lastUUID = localStorage.getItem('lastAccountUUID');
      if (accounts && accounts.length > 0) {
        if (lastUUID) {
          const found = accounts.find(acc => acc.uuid === lastUUID);
          window.currentAccount = found || null;
        } else {
          window.currentAccount = null;
        }
      } else {
        window.currentAccount = null;
      }
    } catch (e) {
      window.currentAccount = null;
      console.warn('[SKINS] Impossible de charger le compte courant:', e);
    }
  }

  // ...existing code...

})();
