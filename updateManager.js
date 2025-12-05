const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

function log(logger, message) {
  if (logger && typeof logger === 'function') {
    logger(message);
  } else {
    console.log(message);
  }
}

function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const toParts = (v) => v.toString().split('.').map(n => parseInt(n, 10) || 0);
  const r = toParts(remote);
  const l = toParts(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i += 1) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

async function fetchManifest(manifestUrl) {
  const res = await fetch(manifestUrl);
  if (!res.ok) {
    throw new Error(`Manifest HTTP ${res.status}`);
  }
  return res.json();
}

async function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await streamPipeline(res.body, fs.createWriteStream(dest));
}

async function verifyAndRepairFiles(manifest, baseDir, logger, progressCallback) {
  if (!manifest.files || !Array.isArray(manifest.files)) return [];
  const results = [];
  const total = manifest.files.length;
  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    const target = path.join(baseDir, file.path);
    const expectedHash = (file.sha256 || '').toLowerCase();
    const currentHash = (await sha256File(target)) || null;
    const ok = currentHash && expectedHash && currentHash === expectedHash;
    
    if (progressCallback) {
      progressCallback({ type: 'progress', current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
    }
    
    if (ok) {
      results.push({ path: file.path, status: 'ok' });
      if (progressCallback) progressCallback({ type: 'file', path: file.path, status: 'ok' });
      continue;
    }
    if (!file.url) {
      results.push({ path: file.path, status: 'missing-url' });
      if (progressCallback) progressCallback({ type: 'file', path: file.path, status: 'error' });
      continue;
    }
    try {
      await downloadFile(file.url, target);
      const newHash = (await sha256File(target)) || '';
      const fixed = expectedHash && newHash.toLowerCase() === expectedHash;
      results.push({ path: file.path, status: fixed ? 'repaired' : 'mismatch-after-download' });
      if (progressCallback) progressCallback({ type: 'file', path: file.path, status: fixed ? 'repair' : 'error' });
    } catch (err) {
      results.push({ path: file.path, status: 'download-error', error: err.message });
      if (progressCallback) progressCallback({ type: 'file', path: file.path, status: 'error' });
    }
  }
  log(logger, `[UPDATE] Vérification terminée (${results.length} fichiers).`);
  return results;
}

async function checkUpdatesAndRepair({ manifestUrl, baseDir, currentVersion, logger, progressCallback }) {
  if (!manifestUrl) throw new Error('Aucune URL de manifeste de mise à jour fournie');
  
  if (progressCallback) progressCallback({ type: 'checking', message: 'Vérification des mises à jour...' });
  
  const manifest = await fetchManifest(manifestUrl);
  const hasUpdate = isNewerVersion(manifest.version, currentVersion);
  
  if (progressCallback) {
    progressCallback({ type: 'version', hasUpdate, version: manifest.version, message: hasUpdate ? `Nouvelle version ${manifest.version} disponible` : 'Version à jour' });
  }
  
  if (hasUpdate) {
    log(logger, `[UPDATE] Nouvelle version disponible: ${manifest.version} (local ${currentVersion}).`);
  } else {
    log(logger, `[UPDATE] Version à jour (local ${currentVersion}, manifest ${manifest.version || 'inconnu'}).`);
  }
  
  const filesResult = await verifyAndRepairFiles(manifest, baseDir, logger, progressCallback);
  
  if (progressCallback) progressCallback({ type: 'complete', message: 'Mise à jour terminée !' });
  
  return {
    hasUpdate,
    manifestVersion: manifest.version,
    filesResult,
  };
}

module.exports = {
  checkUpdatesAndRepair,
};
