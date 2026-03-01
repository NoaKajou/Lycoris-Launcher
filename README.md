V2 Launcher coming soon so don't read this

# Lycoris Launcher

Un launcher Minecraft Java Edition moderne, open source, pensé pour la communauté française, avec une interface personnalisée et une sécurité renforcée.


## Fonctionnalités principales

- **Interface moderne et personnalisée** (Electron.js, design inspiré Minecraft)
- **Authentification Microsoft OAuth2 officielle** (connexion Mojang/Microsoft 100% sécurisée)
- **Multi-comptes** : ajoute, supprime, et change de compte Minecraft en un clic
- **Gestion dynamique des skins** :
  - Affiche toujours le skin du compte sélectionné
  - Rafraîchissement instantané lors d’un changement de compte
  - Import et application de skin personnalisé (.png) sur ton compte Minecraft
  - Sélecteur de modèle (Steve/Alex)
- **Auto-login sécurisé** (refresh_token, reconnexion automatique sans mot de passe)
- **Chiffrement AES-256-GCM** de tous les comptes et tokens (clé unique locale, sécurité maximale)
- **Aucune donnée envoyée à un serveur tiers** (tout reste sur ta machine)
- **Boutons de fenêtre custom** (réduire, agrandir, fermer)
- **Affichage de l’avatar Minecraft** (mc-heads.net)
- **Police Minecraft intégrée** (Minecraftia)
- **Suppression de compte** (depuis l’interface)
- **Panneau latéral pour gérer tous tes comptes**
- **Support complet des tokens Microsoft/Mojang** (refresh, test de validité, gestion d’expiration)
- **Logs de debug pour le développement**

## Ce que tu peux faire avec Lycoris Launcher

- Te connecter avec un ou plusieurs comptes Minecraft/Microsoft
- Changer de compte à la volée, le skin affiché s’actualise instantanément
- Importer un skin personnalisé et l’appliquer à ton compte officiel
- Sélectionner le modèle de skin (Steve ou Alex)
- Supprimer un compte de la liste
- Voir l’avatar et le pseudo de chaque compte
- Tester la validité du token d’accès Minecraft
- Profiter d’une sécurité maximale (chiffrement local, aucun envoi de données)
- Utiliser une interface moderne, rapide et adaptée à la communauté française

---


## Sécurité
- Les tokens et comptes sont chiffrés avec une clé unique générée à l’installation.
- Même si quelqu’un copie le fichier `accounts.json`, il ne pourra rien en faire sans la clé locale.
- **Ne partage jamais tes tokens !**

---

> 🚧 Ce projet est encore en cours de développement et n'est pas prêt à être utilisé ou installé par le public.
> Les instructions d'installation et de configuration seront publiées lors de la sortie officielle.

## Utilisation
- Clique sur « Connexion » pour t’authentifier avec Microsoft.
- Ajoute plusieurs comptes si besoin, change d’utilisateur en un clic.
- Si ton application n’est pas sur la allowlist Mojang, la connexion Minecraft échouera (voir message d’erreur).

## Dépannage
- Si la fenêtre de login Microsoft est blanche, vérifie l’URL de redirection dans Azure et dans le code.
- Si tu obtiens « Invalid app registration » ou « Public clients can't send a client secret », vérifie la configuration Azure.

## Questions fréquentes

### Est-ce que mes comptes sont en sécurité ?
Oui, tout est chiffré localement. La clé de chiffrement ne quitte jamais ta machine.

### Quels sont les risques si je donne mon token ?
Quelqu’un pourrait accéder à ton compte Minecraft/Microsoft, jouer à ta place, ou modifier tes infos. Ne partage jamais tes tokens.

---

**Projet open source non affilié à Mojang/Microsoft.**
