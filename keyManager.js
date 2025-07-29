// keyManager.js
// Gère la génération, le stockage et le chargement sécurisé de la clé de chiffrement AES
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const KEY_PATH = path.join(app.getPath('userData'), 'key.bin');
const KEY_SIZE = 32; // 256 bits

function generateKey() {
  return crypto.randomBytes(KEY_SIZE);
}

function saveKey(key) {
  fs.writeFileSync(KEY_PATH, key);
}

function loadKey() {
  if (!fs.existsSync(KEY_PATH)) {
    const key = generateKey();
    saveKey(key);
    return key;
  }
  return fs.readFileSync(KEY_PATH);
}

module.exports = { loadKey };
