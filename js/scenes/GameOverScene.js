// ============================================================================
// SHARDSTORM — GameOverScene
// Run summary, gold banked, "one more run" hooks: nearest unlock teaser,
// Continue (revive) button, instant retry.
// ============================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { if (data && data.time !== undefined) this.run = data; }

  queueRelayout() {
    if (this.relayoutTimer) this.relayoutTimer.remove();
    this.relayoutTimer = this.time.delayedCall(120, () => this.scene.restart(this.run));
  }

  create() {
    // Re-layout on window resize, preserving the run summary data
    this.scale.on('resize', this.queueRelayout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.queueRelayout, this));

    const W = this.scale.width, H = this.scale.height;
    const r = this.run;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82);
    SS.makePanel(this, W / 2, H / 2, Math.min(380, W * 0.92), Math.min(560, H * 0.92));

    const skull = this.add.image(W / 2 - 92, H / 2 - 230, 'ic_skull').setDisplaySize(34, 34).setTint(0xff5a5a).setScale(0);
    const title = this.add.text(W / 2 - 68, H / 2 - 230, 'YOU FELL', {
      fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ff5a5a'
    }).setOrigin(0, 0.5).setScale(0);
    this.tweens.add({ targets: [skull, title], scale: 1, duration: 400, ease: 'back.out' });

    // ---- run stats, revealed line by line (completion feel) -------------------
    const lines = [
      ['ic_clock', 'Survived', `${Math.floor(r.time / 60)}:${String(r.time % 60).padStart(2, '0')}`],
      ['ic_arrowup', 'Level reached', `${r.level}`],
      ['ic_skull', 'Enemies slain', `${r.kills}`],
      ['ic_coin', 'Gold banked', `+${SS.fmt(r.gold)}`],
      ['ic_gem', 'Gems found', `+${r.gems}`]
    ];
    lines.forEach((l, i) => {
      const y = H / 2 - 160 + i * 36;
      const ic = this.add.image(W / 2 - 140, y, l[0]).setDisplaySize(16, 16).setTint(0x5f7397).setAlpha(0);
      const a = this.add.text(W / 2 - 116, y, l[1], { fontFamily: 'Arial', fontSize: '15px', color: '#9aa7bd' }).setOrigin(0, 0.5).setAlpha(0);
      const b = this.add.text(W / 2 + 140, y, l[2], { fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffd34d' }).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: [ic, a, b], alpha: 1, x: '+=6', delay: 250 + i * 140, duration: 250 });
    });

    // fresh achievements earned this run
    if (r.ach && r.ach.length) {
      this.add.image(W / 2 - 10 - r.ach.length * 40, H / 2 + 26, 'ic_trophy').setDisplaySize(15, 15).setTint(0xffd34d);
      this.add.text(W / 2 + 8 - r.ach.length * 40, H / 2 + 26, r.ach.map(a => a.name).join('  ·  '), {
        fontFamily: 'Arial', fontSize: '13px', color: '#ffd34d'
      }).setOrigin(0, 0.5);
    }

    // ---- "one more run" teaser: what's the next cheapest meta upgrade? ---------
    const next = SS.META
      .map(m => ({ m, lvl: SS.Save.metaLevel(m.id) }))
      .filter(x => x.lvl < x.m.max)
      .sort((a, b) => SS.metaCost(a.m, a.lvl) - SS.metaCost(b.m, b.lvl))[0];
    if (next) {
      const cost = SS.metaCost(next.m, next.lvl);
      const have = SS.Save.data.gold;
      const msg = have >= cost
        ? `You can afford ${next.m.name} (${SS.fmt(cost)} gold)!`
        : `Next unlock: ${next.m.name} — ${SS.fmt(cost - have)} gold to go`;
      this.add.text(W / 2, H / 2 + 58, msg, {
        fontFamily: 'Arial', fontSize: '13px', color: have >= cost ? '#53e05a' : '#7a8db0',
        wordWrap: { width: Math.min(340, W * 0.85) }, align: 'center'
      }).setOrigin(0.5);
    }

    // ---- buttons -----------------------------------------------------------------
    let by = H / 2 + 100;
    if (r.canRevive) {
      const label = r.freeRevive ? 'CONTINUE  (free revive)' : 'CONTINUE  (1 gem)';
      const btn = SS.makeButton(this, W / 2, by, 290, 52, label, 0xb0722c, () => {
        this.scene.stop();
        this.scene.get('Game').revive();
      }, 15, 'ic_flame');
      this.tweens.add({ targets: btn, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });
      by += 62;
    }
    SS.makeButton(this, W / 2, by, 290, 52, 'ONE MORE RUN', 0x11a05a, () => {
      SS.Audio.startMusic();
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.get('Game').scene.restart();
    }, 18, 'ic_sword');
    SS.makeButton(this, W / 2, by + 60, 290, 44, 'MENU', 0x3d4a66, () => {
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.start('Menu');
    }, 15, 'ic_home');
  }
}
