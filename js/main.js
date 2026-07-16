// ============================================================================
// SHARDSTORM — main.js
// Phaser bootstrap: responsive scaling, arcade physics, scene list.
// ============================================================================

(function () {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a0e1a',
    scale: {
      mode: Phaser.Scale.RESIZE,          // fill the window on any device
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene]
  };

  const game = window.game = new Phaser.Game(config); // exposed for debugging

  // Audio unlock safety net: browsers only allow sound after a user gesture.
  // Listen at the document level (works for mouse, touch AND keyboard players)
  // and re-arm music if a run is active but the loop hasn't started yet.
  const unlockAudio = () => {
    SS.Audio.unlock();
    // soundtrack everywhere: menu AND run (browsers need a gesture first)
    const gs = game.scene.getScene('Game');
    const ms = game.scene.getScene('Menu');
    const wantsMusic = (gs && gs.scene.isActive()) || (ms && ms.scene.isActive());
    if (wantsMusic && !SS.Audio.musicTimer) SS.Audio.startMusic();
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    document.addEventListener(ev, unlockAudio, { passive: true }));

  // Pause audio politely when the tab is hidden (also a Poki/CrazyGames requirement)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (SS.Audio.ctx && SS.Audio.ctx.state === 'running') SS.Audio.ctx.suspend();
    } else {
      if (SS.Audio.ctx && SS.Audio.ctx.state === 'suspended') SS.Audio.ctx.resume();
    }
  });

  // Persist the save when the player leaves
  window.addEventListener('beforeunload', () => SS.Save.save());
})();
