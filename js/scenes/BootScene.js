// ============================================================================
// SHARDSTORM — BootScene
// Loads the save, generates all procedural textures, then heads to the menu.
// (There are no external assets to download, so boot is near-instant.)
// ============================================================================

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    SS.Save.load();
    SS.generateTextures(this);

    // Hide the HTML CSS loader now that the engine is alive
    const loader = document.getElementById('loader');
    if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 450); }

    // Unlock WebAudio on the very first user gesture anywhere
    this.input.once('pointerdown', () => SS.Audio.unlock());

    this.scene.start('Menu');
  }
}
