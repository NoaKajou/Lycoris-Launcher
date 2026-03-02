<p align="center">
  <img src="./app/assets/images/SealCircle.png" width="150px" height="150px" alt="Lycoris Launcher">
</p>

<h1 align="center">🚀 Lycoris Launcher</h1>
=======

<p align="center">
  <sub>(anciennement Electron Launcher)</sub>
</p>

---

## 📸 Captures d'écran

<p align="center">
  <img src="https://i.imgur.com/6o7SmH6.png" alt="Interface principale" width="45%">
  <img src="https://i.imgur.com/x3B34n1.png" alt="Paramètres" width="45%">
</p>

---

## ✨ Fonctionnalités

### 🔐 **Gestion complète des comptes**
- ✅ Ajoutez plusieurs comptes et basculez facilement
- ✅ Authentification Microsoft (OAuth 2.0) et Mojang (Yggdrasil)
- ✅ Identifiants jamais stockés et transmis directement à Mojang
- ✅ Interface multilingue (Français/Anglais)

### 📂 **Gestion intelligente des assets**
- ✅ Réception automatique des mises à jour client
- ✅ Validation des fichiers avant lancement
- ✅ Re-téléchargement automatique des fichiers corrompus

### ☕ **Validation automatique Java**
- ✅ Installation automatique de la bonne version de Java
- ✅ Aucune installation Java préalable requise
- ✅ Support Java 8, 11, 17 et versions ultérieures

### 🎮 **Interface moderne**
- ✅ Flux d'actualités intégré
- ✅ Tableau de bord de paramètres intuitif
- ✅ Thèmes avec backgrounds aléatoires
- ✅ Compteur de joueurs en temps réel

### 🌍 **Support multi-serveurs**
- ✅ Basculement facile entre configurations
- ✅ Support de tous types de serveurs (Vanilla, Forge, Fabric...)
- ✅ Gestion automatique des mods requis/optionnels

### 🔄 **Mises à jour automatiques**
- ✅ Le lanceur se met à jour automatiquement
- ✅ Statut des services Mojang en temps réel
- ✅ Notifications de nouvelles versions

---

## 📥 Téléchargement

### 🎯 **Version stable**
[![Latest Release](https://img.shields.io/github/release/NoaKajou/Lycoris-Launcher.svg?style=for-the-badge&logo=github)](https://github.com/NoaKajou/Lycoris-Launcher/releases/latest)

### 🧪 **Pré-version (Beta)**
[![Latest Pre-Release](https://img.shields.io/github/release/NoaKajou/Lycoris-Launcher/all.svg?style=for-the-badge&logo=github)](https://github.com/NoaKajou/Lycoris-Launcher/releases)

### 💻 **Plateformes supportées**

| Plateforme | Fichier | Statut |
|------------|---------|---------|
| Windows x64 | `Lycoris-Launcher-setup-VERSION.exe` | X Not Stable |
| macOS Intel | `Lycoris-Launcher-setup-VERSION-x64.dmg` | X Not Stable |
| macOS Apple Silicon | `Lycoris-Launcher-setup-VERSION-arm64.dmg` | X Not Stable |
| Linux x64 | `Lycoris-Launcher-setup-VERSION.AppImage` | X Stable |

---

## 🚧 Roadmap

### **Prochaines améliorations**
- 🎨 **Thèmes personnalisables** - Mode sombre/clair
- ⚡ **Optimisation login Microsoft** - Réduction temps d'attente  
- 📂 **Profils de lancement** - Configurations multiples
- 🔧 **Performance générale** - Optimisations RAM/CPU

### **Idées futures**
- Discord Rich Presence, gestionnaire de captures, support modpacks avancé

---

## 🛠️ Développement

### **Prérequis**
- [Node.js](https://nodejs.org/) v20 ou supérieur
- [Git](https://git-scm.com/)
- Éditeur de code (VS Code recommandé)

### **Installation**
```bash
# Cloner le projet
git clone https://github.com/NoaKajou/Lycoris-Launcher.git
cd Lycoris-Launcher

# Installer les dépendances
npm install

# Lancer en mode développement
npm start
```

### **Build & Distribution**
```bash
# Build pour votre plateforme
npm run dist

# Build spécifique
npm run dist:win    # Windows
npm run dist:mac    # macOS  
npm run dist:linux  # Linux
```

### **Scripts disponibles**
| Commande | Description |
|----------|-------------|
| `npm start` | Lance l'application en mode dev |
| `npm run dist` | Build pour la plateforme actuelle |
| `npm run dist:all` | Build pour toutes les plateformes |
| `npm test` | Lance les tests unitaires |
| `npm run lint` | Vérification code style |

---

## 🐛 Console & Debugging

### **Ouvrir la console développeur**
```
Ctrl + Shift + I  (Windows/Linux)
Cmd + Opt + I     (macOS)
```

### **Exporter les logs**
1. Clic droit dans la console
2. Sélectionner **"Save as..."**
3. Enregistrer le fichier de log

⚠️ **Attention**: Ne collez jamais de code dans la console sans être sûr de ce qu'il fait !

---

## 📞 Support & Communauté

### **Besoin d'aide ?**
- 📖 [Wiki officiel](https://github.com/NoaKajou/Lycoris-Launcher/wiki)
- 💬 [Discord communautaire](https://discord.gg/zNWUXdt)
- 🐛 [Signaler un bug](https://github.com/NoaKajou/Lycoris-Launcher/issues)
- 💡 [Suggérer une fonctionnalité](https://github.com/NoaKajou/Lycoris-Launcher/issues/new?template=feature_request.md)

### **Contribuer**
Les contributions sont les bienvenues ! Consultez le [guide de contribution](CONTRIBUTING.md).

### **Ressources utiles**
- [Nebula (Distribution.json Creator)](https://github.com/dscalzi/Nebula)
- [Documentation Microsoft Auth](https://github.com/NoaKajou/Lycoris-Launcher/blob/master/docs/MicrosoftAuth.md)
- [Branche V2 (Réécriture)](https://github.com/NoaKajou/Lycoris-Launcher/tree/ts-refactor)

---

## 📄 Licence & Crédits

Ce projet est sous licence [LICENCE](LICENSE). 

**Utilisation par des tiers**: Merci de créditer l'auteur original et de fournir un lien vers la source. C'est un logiciel gratuit, faites au moins cela.

---

<p align="center">
  <img src="https://forthebadge.com/images/badges/winter-is-coming.svg" alt="Winter is Coming">
  <br>
  <strong>See you ingame! 🎮</strong>
</p>
