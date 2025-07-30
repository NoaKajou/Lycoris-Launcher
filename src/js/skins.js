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
    if (window.accounts && window.accounts.length > 0) return window.accounts[0].uuid;
    if (localStorage.getItem('lastAccountUUID')) return localStorage.getItem('lastAccountUUID');
    return null;
  }

  function getAccessToken() {
    if (window.currentAccount && window.currentAccount.accessToken) return window.currentAccount.accessToken;
    if (window.accounts && window.accounts.length > 0 && window.accounts[0].accessToken) return window.accounts[0].accessToken;
    return null;
  }

  // --- Gestion de la galerie de skins locaux ---
  const skinGallery = document.getElementById('skinGallery');
  const skinStatus = document.getElementById('skinStatus');
  const { ipcRenderer } = window.require ? window.require('electron') : {};

  // Utilitaire pour lire les skins locaux (via preload ou IPC)
  async function listLocalSkins() {
    if (window.electronAPI && window.electronAPI.listSkins) {
      return await window.electronAPI.listSkins();
    }
    // Fallback : rien
    return [];
  }

  async function refreshSkinGallery() {
    skinGallery.innerHTML = '';
    const skins = await listLocalSkins();
    skins.forEach(skin => {
      const div = document.createElement('div');
      div.style = 'border:1px solid #333;border-radius:6px;padding:4px;cursor:pointer;background:#222;';
      div.title = skin.name;
      div.innerHTML = `<img src="${skin.path}" alt="${skin.name}" style="width:48px;height:48px;display:block;margin:auto;">`;
      div.addEventListener('click', () => {
        // Charge le skin dans l'aperçu
        loadSkinFromFile(skin.path, skin.variant || 'default');
        document.getElementById('modelSelect').value = skin.variant || 'default';
      });
      skinGallery.appendChild(div);
    });
  }

  // --- Aperçu d'un skin importé (fichier local) ---
  let importedSkinFile = null;
  async function loadSkinFromFile(filePathOrBlob, variant) {
    if (!window.skinview3d) return;
    if (!viewer) {
      viewer = new skinview3d.SkinViewer({
        canvas: document.getElementById("skinCanvas"),
        width: 300,
        height: 400,
        skin: filePathOrBlob,
        model: variant || 'default'
      });
      viewer.controls.enableZoom = false;
      viewer.controls.enableRotate = true;
    } else {
      viewer.loadSkin(filePathOrBlob, variant || 'default');
    }
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
      } else {
        viewer.loadSkin(skinUrl, model);
      }
      viewer.loadCape(null);
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
      loadSkin(uuid, document.getElementById("modelSelect").value, null);
    }
  }

  // (Suppression de toute la logique d'affichage des capes)


  // Initialisation : preview du skin du compte
  loadCurrentAccountSkin();

  // Preview dynamique si changement de compte ou modèle
  let lastUUID = getUUID();
  setInterval(() => {
    const currentUUID = getUUID();
    if (currentUUID !== lastUUID) {
      lastUUID = currentUUID;
      loadCurrentAccountSkin();
    }
  }, 1000);
  document.getElementById("modelSelect").addEventListener("change", (e) => {
    if (importedSkinFile) {
      loadSkinFromFile(importedSkinFile, e.target.value);
    } else {
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
        // Sauvegarde locale (via preload/IPC)
        if (window.electronAPI && window.electronAPI.saveSkin) {
          const arrayBuffer = await importedSkinFile.arrayBuffer();
          await window.electronAPI.saveSkin({
            name: importedSkinFile.name,
            data: Array.from(new Uint8Array(arrayBuffer)),
            variant
          });
        }
        refreshSkinGallery();
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
      window.accounts = accounts;
      if (accounts && accounts.length > 0) {
        window.currentAccount = accounts.find(acc => acc.uuid === localStorage.getItem('lastAccountUUID')) || accounts[0];
      }
    } catch (e) {
      console.warn('[SKINS] Impossible de charger les comptes:', e);
    }
  }

  // Affiche la galerie au chargement
  refreshSkinGallery();

})();
