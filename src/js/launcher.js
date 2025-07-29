function launchGame() {
  const version = document.getElementById('versionSelector').value;
  if (window.electronAPI && window.electronAPI.launch) {
    window.electronAPI.launch(version);
  } else {
    alert('Lancement du jeu pour la version ' + version);
  }
}
