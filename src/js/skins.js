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
    // Récupère l'UUID du compte sélectionné sur le bouton joueur, sinon fallback sur currentAccount
    let uuid = null;
    let accData = null;
    const playerBtn = document.getElementById('player-btn');
    if (playerBtn) {
      const username = playerBtn.querySelector('.user-name')?.textContent;
      if (window.electronAPI && window.electronAPI.getAccounts && username) {
        const accounts = await window.electronAPI.getAccounts();
        const acc = accounts.find(a => a.username === username);
        if (acc) {
          uuid = acc.uuid;
          localStorage.setItem('lastAccountUUID', acc.uuid);
        }
      }
    }
    // Fallback : si pas de bouton joueur ou pas d'UUID, on prend le compte courant
    if (!uuid && window.currentAccount && window.currentAccount.uuid) {
      uuid = window.currentAccount.uuid;
    }
    if (!uuid) {
      tokenTestResult.textContent = 'Aucun compte sélectionné.';
      return;
    }
    // Toujours forcer le refresh du token, même si le compte courant est déjà sélectionné
    try {
      if (window.electronAPI && window.electronAPI.switchAccount) {
        accData = await window.electronAPI.switchAccount(uuid, { forceRefresh: true });
        window.currentAccount = accData;
      } else {
        accData = window.currentAccount;
      }
    } catch (e) {
      tokenTestResult.textContent = 'Erreur lors de la sélection du compte : ' + e.message;
      return;
    }
    // Utilise toujours le vrai token Minecraft si dispo
    const accessToken = accData && (accData.minecraftAccessToken || accData.accessToken);
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
      const mcProfileUrl = 'https://api.minecraftservices.com/minecraft/profile';
      const mcProfileHeaders = { 'Authorization': 'Bearer ' + accessToken };
      console.debug('[DEBUG][MC-API] GET', mcProfileUrl);
      console.debug('[DEBUG][MC-API] Headers:', mcProfileHeaders);
      const res = await fetch(mcProfileUrl, {
        headers: mcProfileHeaders
      });
      let apiMsg = '';
      try {
        const apiJson = await res.json();
        if (apiJson && (apiJson.errorMessage || apiJson.error)) {
          apiMsg = ' | ' + (apiJson.errorMessage || apiJson.error);
        }
      } catch {}
      if (res.status === 200) {
        tokenTestResult.textContent = '✅ Token valide : accès au profil Minecraft OK.';
      } else if (res.status === 401) {
        tokenTestResult.textContent = '❌ Token invalide ou expiré (401). Relogue-toi.' + apiMsg;
      } else if (res.status === 404) {
        tokenTestResult.textContent = '❌ Aucun compte Minecraft n\'est associé à ce compte Microsoft (404).' + apiMsg;
      } else {
        tokenTestResult.textContent = 'Réponse inattendue : ' + res.status + apiMsg;
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
    // Utilise toujours le vrai token Minecraft si dispo
    if (window.currentAccount && window.currentAccount.minecraftAccessToken) return window.currentAccount.minecraftAccessToken;
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
    let variant = decoded.textures.SKIN?.metadata?.model || 'classic';
    // Mojang renvoie 'slim' pour Alex, sinon rien (donc classic)
    if (skinUrl && skinUrl.startsWith('http://')) skinUrl = skinUrl.replace('http://', 'https://');
    if (skinUrl) {
      skinUrl += `?t=${Date.now()}`;
    }
    // Met à jour le select si présent
    const select = document.getElementById('modelSelect');
    if (select) {
      select.value = (variant === 'slim') ? 'slim' : 'classic';
    }
    resetViewer(skinUrl, (variant === 'slim') ? 'slim' : 'default');
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
  renderSkinGallery(); // Rafraîchit la galerie à chaque changement de compte
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
      // Recharge l'aperçu avec le nouveau modèle, mais NE PAS réinitialiser importedSkinFile
      const reader = new FileReader();
      reader.onload = function(evt) {
        loadSkinFromFile(evt.target.result, e.target.value);
      };
      reader.readAsDataURL(importedSkinFile);
    } else if (window.currentAccount && window.currentAccount.uuid) {
      loadCurrentAccountSkin();
    }
  });

  // --- Import d'un skin personnalisé + stockage local ---
  document.getElementById('skinFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.png')) {
      skinStatus.textContent = 'Le fichier doit être un .png';
      return;
    }
    importedSkinFile = file;
    // Associe le skin à l'UUID du compte courant (ou 'default' si aucun)
    let uuid = (window.currentAccount && window.currentAccount.uuid) ? window.currentAccount.uuid : 'default';
    const reader = new FileReader();
    reader.onload = function(evt) {
      // Détection automatique du modèle (slim/classic) à partir du PNG
      const img = new window.Image();
      img.onload = function() {
        let detected = 'classic';
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          let isSlim = true;
          for (let y = 52; y <= 63; y++) {
            for (let x = 46; x <= 47; x++) {
              const alpha = ctx.getImageData(x, y, 1, 1).data[3];
              if (alpha !== 0) {
                isSlim = false;
                break;
              }
            }
            if (!isSlim) break;
          }
          if (isSlim) detected = 'slim';
        } catch (err) {}
        document.getElementById('modelSelect').value = detected;
        loadSkinFromFile(evt.target.result, detected);
        skinStatus.textContent = 'Modèle détecté : ' + detected;
        // --- Stockage local du skin dans la galerie ---
        // Galerie par compte
        let allGalleries = {};
        try {
          allGalleries = JSON.parse(localStorage.getItem('skinGalleryByAccount') || '{}');
        } catch {}
        let gallery = allGalleries[uuid] || [];
        // Empêche les doublons (même nom + même data)
        if (!gallery.some(s => s.name === file.name && s.data === evt.target.result)) {
          gallery.push({
            name: file.name,
            data: evt.target.result,
            model: detected,
            date: Date.now()
          });
          allGalleries[uuid] = gallery;
          localStorage.setItem('skinGalleryByAccount', JSON.stringify(allGalleries));
        }
        renderSkinGallery();
      };
      img.onerror = function() {
        loadSkinFromFile(evt.target.result, document.getElementById('modelSelect').value);
        skinStatus.textContent = '';
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  // --- Affichage et gestion de la galerie de skins ---
  function renderSkinGallery() {
    const galleryDiv = document.getElementById('skinGallery');
    // Galerie par compte
    let allGalleries = {};
    let uuid = (window.currentAccount && window.currentAccount.uuid) ? window.currentAccount.uuid : 'default';
    try {
      allGalleries = JSON.parse(localStorage.getItem('skinGalleryByAccount') || '{}');
    } catch {}
    let gallery = allGalleries[uuid] || [];
    galleryDiv.innerHTML = '';
    if (!gallery.length) {
      galleryDiv.textContent = 'Aucun skin enregistré.';
      return;
    }
    gallery.slice().reverse().forEach((skin, idx) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '0.2em';
      wrapper.style.background = '#222';
      wrapper.style.borderRadius = '8px';
      wrapper.style.padding = '0.5em';
      wrapper.style.boxShadow = '0 1px 4px #0008';
      wrapper.style.width = '64px';
      wrapper.style.position = 'relative';
      // Bouton croix (supprimer)
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.title = 'Supprimer ce skin';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '2px';
      closeBtn.style.right = '2px';
      closeBtn.style.background = 'rgba(40,40,40,0.8)';
      closeBtn.style.color = '#e74c3c';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.width = '18px';
      closeBtn.style.height = '18px';
      closeBtn.style.fontSize = '1em';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.zIndex = '2';
      closeBtn.onclick = (ev) => {
        ev.stopPropagation();
        // Supprime le skin de la galerie du compte
        let allGalleries = {};
        let uuid = (window.currentAccount && window.currentAccount.uuid) ? window.currentAccount.uuid : 'default';
        try {
          allGalleries = JSON.parse(localStorage.getItem('skinGalleryByAccount') || '{}');
        } catch {}
        let gallery = allGalleries[uuid] || [];
        // On identifie le skin par son nom et data
        gallery = gallery.filter(s => !(s.name === skin.name && s.data === skin.data));
        allGalleries[uuid] = gallery;
        localStorage.setItem('skinGalleryByAccount', JSON.stringify(allGalleries));
        renderSkinGallery();
      };
      // Miniature 2D (face avant)
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 64;
      canvas.style.background = '#181b20';
      canvas.style.borderRadius = '4px';
      canvas.title = skin.name + ' (' + skin.model + ')';
      canvas.style.cursor = 'pointer';
      // Rendu 2D face avant
      const img = new window.Image();
      img.onload = function() {
        const ctx = canvas.getContext('2d');
        // Tête (8x8)
        ctx.drawImage(img, 8, 8, 8, 8, 16, 0, 16, 16);
        // Corps (8x12)
        ctx.drawImage(img, 20, 20, 8, 12, 16, 16, 16, 24);
        // Jambe gauche (4x12)
        ctx.drawImage(img, 4, 20, 4, 12, 16, 40, 8, 24);
        // Jambe droite (4x12)
        ctx.drawImage(img, 20, 52, 4, 12, 24, 40, 8, 24);
        // Bras gauche (4x12)
        ctx.drawImage(img, 36, 52, 4, 12, 8, 16, 8, 24);
        // Bras droit (4x12)
        ctx.drawImage(img, 44, 20, 4, 12, 32, 16, 8, 24);
        // Overlay tête (casque)
        ctx.drawImage(img, 40, 8, 8, 8, 16, 0, 16, 16);
      };
      img.src = skin.data;
      // Appliquer le skin au clic sur la miniature
      canvas.onclick = () => {
        importedSkinFile = dataURLtoFile(skin.data, skin.name);
        document.getElementById('modelSelect').value = skin.model;
        loadSkinFromFile(skin.data, skin.model);
        skinStatus.textContent = 'Skin sélectionné : ' + skin.name;
      };
      // Nom
      const name = document.createElement('div');
      name.textContent = skin.name;
      name.style.fontSize = '0.7em';
      name.style.color = '#ccc';
      name.style.textAlign = 'center';
      name.style.wordBreak = 'break-all';
      // Ajout
      wrapper.appendChild(closeBtn);
      wrapper.appendChild(canvas);
      wrapper.appendChild(name);
      galleryDiv.appendChild(wrapper);
    });
  }

  // Utilitaire : convertir un dataURL en File
  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]);
    let n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  // Affiche la galerie au chargement
  renderSkinGallery();

  // --- Appliquer le skin personnalisé sur le compte Minecraft ---
  document.getElementById('applySkinBtn').addEventListener('click', async () => {
    if (!importedSkinFile) {
      skinStatus.textContent = "Importe d'abord un skin .png";
      return;
    }
    // Vérifie que le fichier est bien un File natif (pas un dataURL ou Blob reconstruit)
    if (!(importedSkinFile instanceof File)) {
      skinStatus.textContent = 'Erreur : le fichier skin doit être un fichier PNG natif.';
      return;
    }
    // Récupère l'UUID du compte sélectionné sur le bouton joueur, sinon fallback sur currentAccount
    let uuid = null;
    let accData = null;
    const playerBtn = document.getElementById('player-btn');
    if (playerBtn) {
      const username = playerBtn.querySelector('.user-name')?.textContent;
      if (window.electronAPI && window.electronAPI.getAccounts && username) {
        const accounts = await window.electronAPI.getAccounts();
        const acc = accounts.find(a => a.username === username);
        if (acc) {
          uuid = acc.uuid;
          localStorage.setItem('lastAccountUUID', acc.uuid);
        }
      }
    }
    // Fallback : si pas de bouton joueur ou pas d'UUID, on prend le compte courant
    if (!uuid && window.currentAccount && window.currentAccount.uuid) {
      uuid = window.currentAccount.uuid;
    }
    if (!uuid) {
      skinStatus.textContent = 'Aucun compte sélectionné.';
      return;
    }
    // Toujours forcer le refresh du token, même si le compte courant est déjà sélectionné
    try {
      if (window.electronAPI && window.electronAPI.switchAccount) {
        accData = await window.electronAPI.switchAccount(uuid, { forceRefresh: true });
        window.currentAccount = accData;
      } else {
        accData = window.currentAccount;
      }
    } catch (e) {
      skinStatus.textContent = 'Erreur lors de la sélection du compte : ' + e.message;
      return;
    }
    let variant = document.getElementById('modelSelect').value;
    // DEBUG: log la valeur brute
    console.log('[DEBUG] variant:', variant);
    // Vérification stricte du champ variant
    if (variant !== 'classic' && variant !== 'slim') {
      skinStatus.textContent = 'Erreur : valeur de modèle invalide (' + variant + ').';
      return;
    }
    // Utilise toujours le vrai token Minecraft si dispo
    const accessToken = accData && (accData.minecraftAccessToken || accData.accessToken);
    if (!accessToken) {
      skinStatus.textContent = 'Aucun accessToken valide pour ce compte.';
      return;
    }

    // Vérifie explicitement le profil Minecraft avant d'appliquer le skin
    skinStatus.textContent = 'Vérification du compte Minecraft...';
    try {
      const mcProfileUrl = 'https://api.minecraftservices.com/minecraft/profile';
      const mcProfileHeaders = { 'Authorization': 'Bearer ' + accessToken };
      console.debug('[DEBUG][MC-API] GET', mcProfileUrl);
      console.debug('[DEBUG][MC-API] Headers:', mcProfileHeaders);
      const profileRes = await fetch(mcProfileUrl, {
        headers: mcProfileHeaders
      });
      if (profileRes.status === 401) {
        skinStatus.textContent = 'Token invalide ou expiré (401). Relogue-toi.';
        return;
      } else if (profileRes.status === 404) {
        skinStatus.textContent = 'Aucun compte Minecraft n\'est associé à ce compte Microsoft.';
        return;
      } else if (profileRes.status !== 200) {
        skinStatus.textContent = 'Erreur lors de la vérification du profil : ' + profileRes.status;
        return;
      }
    } catch (e) {
      skinStatus.textContent = 'Erreur lors de la vérification du profil : ' + e.message;
      return;
    }

    skinStatus.textContent = 'Envoi du skin...';
    // Log debug détaillé du token et du FormData
    console.debug('[SKIN-UPLOAD] accessToken:', accessToken);
    console.debug('[SKIN-UPLOAD] variant:', variant);
    console.debug('[SKIN-UPLOAD] importedSkinFile:', importedSkinFile);
    if (window.electronAPI && window.electronAPI.logSkinUpload) {
      try { window.electronAPI.logSkinUpload(uuid, importedSkinFile.name); } catch (e) {}
    }
    try {
      const formData = new FormData();
      // Ajoute TOUJOURS 'variant' (classic ou slim) comme l'exige la doc Mojang
      formData.append('variant', variant);
      formData.append('file', importedSkinFile, 'skin.png');
      // Log et affiche le contenu du FormData (clé/valeur) pour debug
      let fdDebug = [];
      for (let pair of formData.entries()) {
        fdDebug.push([pair[0], pair[1]]);
      }
      console.debug('[SKIN-UPLOAD] FormData DEBUG:', fdDebug);
      skinStatus.textContent = 'DEBUG FormData: ' + JSON.stringify(fdDebug);
      const mcSkinUrl = 'https://api.minecraftservices.com/minecraft/profile/skins';
      // Ne surtout pas inclure Content-Type ici, laisser le navigateur gérer le boundary du FormData
      const mcSkinHeaders = {
        'Authorization': 'Bearer ' + accessToken
        // ne pas inclure Content-Type ici
      };
      console.debug('[DEBUG][MC-API] POST', mcSkinUrl);
      console.debug('[DEBUG][MC-API] Headers:', mcSkinHeaders);
      console.debug('[DEBUG][MC-API] Body: FormData', Array.from(formData.entries()));
      const res = await fetch(mcSkinUrl, {
        method: 'POST',
        headers: mcSkinHeaders,
        body: formData
      });
      const result = await res.text();
      console.log('[DEBUG] status:', res.status);
      console.log('[DEBUG] body:', result);
      if (res.status === 200) {
        skinStatus.textContent = 'Skin appliqué avec succès !';
        setTimeout(() => loadCurrentAccountSkin(), 1000);
      } else {
        skinStatus.textContent = 'Erreur API : ' + result;
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
