

# Lycoris Launcher

Un launcher Minecraft Java Edition moderne, open source, pensé pour la communauté française, avec une interface personnalisée et une sécurité renforcée.

## Fonctionnalités principales
- Interface moderne et personnalisée (Electron.js)
- Authentification Microsoft OAuth2 officielle (Mojang)
- Multi-comptes : ajoute, supprime, et change de compte facilement
- Auto-login sécurisé (refresh_token)
- Boutons de fenêtre custom (réduire, agrandir, fermer)
- Affichage de l’avatar Minecraft (mc-heads.net)
- Police Minecraft intégrée (Minecraftia)
- Chiffrement AES-256-GCM des comptes (clé unique locale)
- Aucune donnée envoyée à un serveur tiers


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
