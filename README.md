

> ⚠️ **Attention : Ce launcher n'est pas encore fonctionnel.**
>
> L'accès à l'API Minecraft Java Edition nécessite désormais une approbation manuelle de Mojang/Microsoft. Tant que l'application n'est pas sur la allowlist officielle, l'authentification Minecraft échouera.

# Lycoris Launcher

Un launcher Minecraft Java Edition moderne, open source, développé avec Electron.js et authentification Microsoft officielle.

## Fonctionnalités
- Interface personnalisée et moderne (Electron.js)
- Authentification Microsoft OAuth2 (support officiel Mojang)
- Récupération du profil Minecraft après connexion
- Boutons de fenêtre personnalisés (minimiser, maximiser, fermer)
- Prêt pour la future allowlist Mojang

## Prérequis
- Node.js (>= 16)
- Un compte Microsoft avec un compte Minecraft Java Edition associé
- Une application Azure enregistrée (voir ci-dessous)

## Installation
```bash
git clone https://github.com/tonpseudo/Lycoris-Launcher.git
cd Lycoris-Launcher
npm install
```

## Configuration Azure/Microsoft
1. Crée une application sur https://portal.azure.com/
2. Type de comptes : Comptes Microsoft personnels uniquement
3. Plateforme : Application mobile et de bureau
4. URL de redirection : `http://localhost:3000/auth`
5. Récupère le client_id et (si besoin) le client_secret
6. (Optionnel) Ajoute ton application à la allowlist Mojang : https://aka.ms/java-api-allowlist

## Lancement
```bash
npm start
```

## Utilisation
- Clique sur "Se connecter avec Microsoft" pour lancer l’authentification.
- Si ton application n’est pas encore sur la allowlist Mojang, la connexion Minecraft échouera (voir message d’erreur).

## Dépannage
- Si la fenêtre de login Microsoft est blanche, vérifie l’URL de redirection dans Azure et dans le code.
- Si tu obtiens "Invalid app registration" ou "Public clients can't send a client secret", vérifie la configuration Azure (voir plus haut).
- Pour toute question sur la allowlist Mojang, voir : https://aka.ms/java-api-allowlist

**Projet open source non affilié à Mojang/Microsoft.**
