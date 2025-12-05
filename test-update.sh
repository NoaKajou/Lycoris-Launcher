#!/bin/bash

echo "🧪 Script de test du système de mise à jour"
echo "==========================================="
echo ""

# 1. Démarre un serveur HTTP local sur le port 8080
echo "📡 Démarrage du serveur HTTP local (port 8080)..."
python3 -m http.server 8080 &
SERVER_PID=$!
echo "   Serveur PID: $SERVER_PID"
sleep 2

# 2. Configure la variable d'environnement pour pointer vers le manifeste local
export UPDATE_MANIFEST_URL="http://localhost:8080/test-update-manifest.json"
echo "   UPDATE_MANIFEST_URL=$UPDATE_MANIFEST_URL"
echo ""

# 3. Lance l'application
echo "🚀 Lancement de l'application..."
echo "   (Les logs de mise à jour apparaîtront dans la console)"
echo ""
npm start

# 4. Nettoie le serveur HTTP à la fermeture
echo ""
echo "🧹 Nettoyage..."
kill $SERVER_PID 2>/dev/null
echo "✅ Serveur arrêté"
