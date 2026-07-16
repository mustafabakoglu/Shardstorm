// ============================================================================
// SHARDSTORM — UIScene
// HUD overlay running in parallel with GameScene: bars, counters, relic slots,
// combo meter, boss bar, toasts, the level-up draft, and the pause menu.
// ============================================================================

class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.game_ = this.scene.get('Game');
    this.paused = false;
    this.choosing = false;
    this.overlay = null;

    // ---- top-left: HP + XP bars ---------------------------------------------
    const barW = Math.min(240, W * 0.4);
    this.add.rectangle(16, 18, barW, 18, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(1);
    this.hpBar = this.add.rectangle(18, 18, barW - 4, 14, SS.COLORS.hp).setOrigin(0, 0.5).setDepth(2);
    this.hpText = this.add.text(16 + barW / 2, 18, '', { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#fff' }).setOrigin(0.5).setDepth(3);
    this.hpBarW = barW - 4;

    this.add.rectangle(16, 38, barW, 10, 0x000000, 0.55).setOrigin(0, 0.5).setDepth(1);
    this.xpBar = this.add.rectangle(18, 38, 1, 6, SS.COLORS.xp).setOrigin(0, 0.5).setDepth(2);
    this.xpBarW = barW - 4;
    this.lvlText = this.add.text(16, 56, 'Lv 1', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#53e05a' }).setOrigin(0, 0.5).setDepth(2);

    // ---- top-center: run timer ------------------------------------------------
    this.timerText = this.add.text(W / 2, 20, '0:00', {
      fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(2).setShadow(0, 2, '#000a', 3);

    // ---- top-right: gold, kills, pause -----------------------------------------
    this.goldText = this.add.text(W - 74, 18, '0', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffd34d' }).setOrigin(1, 0.5).setDepth(2);
    this.add.image(W - 62, 18, 'gold').setDepth(2);
    this.killText = this.add.text(W - 74, 42, '0', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#9aa7bd' }).setOrigin(1, 0.5).setDepth(2);
    this.add.image(W - 62, 42, 'ic_skull').setDisplaySize(14, 14).setTint(0x9aa7bd).setDepth(2);
    this.pauseBtn = SS.makeIconButton(this, W - 26, 26, 17, 'ic_pause', 0x3d4a66, () => this.togglePause()).setDepth(5);

    // ---- red vignette that pulses when the player takes damage -------------------
    this.vignette = this.add.image(W / 2, H / 2, 'vignette')
      .setDisplaySize(W, H).setDepth(25).setAlpha(0);

    // ---- combo meter (center, pops on kill streaks) -----------------------------
    this.comboText = this.add.text(W / 2, 62, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ff9c3f'
    }).setOrigin(0.5).setDepth(2).setShadow(0, 2, '#000a', 3).setVisible(false);

    // ---- boss HP bar --------------------------------------------------------------
    this.bossBarBg = this.add.rectangle(W / 2, H - 24, Math.min(420, W * 0.8), 16, 0x000000, 0.6).setDepth(2).setVisible(false);
    this.bossBar = this.add.rectangle(W / 2 - Math.min(420, W * 0.8) / 2 + 2, H - 24, 1, 12, 0xff5347).setOrigin(0, 0.5).setDepth(3).setVisible(false);
    this.bossBarW = Math.min(420, W * 0.8) - 4;
    this.bossLabel = this.add.text(W / 2, H - 42, 'T I T A N', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ff5347' }).setOrigin(0.5).setDepth(2).setVisible(false);

    // ---- relic slot strip (bottom-left): live view of the merge board -------------
    this.slotIcons = [];
    this.slotY = H - 30;

    // ---- dash cooldown indicator (bottom-right, tap to dash on mobile) ------------
    this.dashBtn = this.add.container(W - 46, H - 50).setDepth(5);
    const dashBg = this.add.circle(0, 0, 30, 0x1b2a47, 0.9).setStrokeStyle(2, 0x4de1ff);
    const dashIcon = this.add.image(0, 0, 'ic_wind').setDisplaySize(26, 26).setTint(0x4de1ff);
    this.dashArc = this.add.graphics();
    this.dashBtn.add([dashBg, dashIcon, this.dashArc]);
    this.dashBtn.setSize(60, 60).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.game_.doDash());

    // ---- toast queue ---------------------------------------------------------------
    this.toastY = 100;

    this.setHp(this.game_.stats.hp, this.game_.stats.maxHp);
    this.setRelics(this.game_.relics, this.game_.maxSlots);

    // Register with GameScene (replaces its no-op UI stub)
    this.game_.ui = this;

    // Re-anchor HUD on window resize (skip while a modal overlay is open)
    this.scale.on('resize', this.queueRelayout, this);
    this.events.once('shutdown', () => {
      this.overlay = null;
      this.scale.off('resize', this.queueRelayout, this);
    });
  }

  queueRelayout() {
    if (this.paused || this.choosing) return;
    if (this.relayoutTimer) this.relayoutTimer.remove();
    this.relayoutTimer = this.time.delayedCall(120, () => this.scene.restart());
  }

  update() {
    // dash cooldown radial fill
    const g = this.game_;
    if (!g || !g.stats) return;
    const remain = Math.max(0, g.dashReadyAt - g.time.now);
    this.dashArc.clear();
    if (remain > 0) {
      this.dashArc.fillStyle(0x000000, 0.55);
      this.dashArc.slice(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + (remain / g.stats.dashCd) * Math.PI * 2, false);
      this.dashArc.fillPath();
    }
  }

  // --------------------------------------------------------------------------
  // HUD setters (called by GameScene)
  // --------------------------------------------------------------------------
  setHp(hp, max) {
    this.hpBar.width = Math.max(0, this.hpBarW * (hp / max));
    this.hpText.setText(`${Math.ceil(Math.max(0, hp))} / ${max}`);
  }
  setXp(xp, need, level) {
    this.xpBar.width = Math.max(1, this.xpBarW * (xp / need));
    this.lvlText.setText('Lv ' + level);
  }
  setTimer(s) { this.timerText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); }
  setGold(gd) {
    this.goldText.setText(SS.fmt(gd));
    this.tweens.add({ targets: this.goldText, scale: 1.25, duration: 80, yoyo: true });
  }
  setKills(k) { this.killText.setText('' + k); }

  // red vignette pulse on player damage
  hurtFlash() {
    this.vignette.setAlpha(0.95);
    this.tweens.add({ targets: this.vignette, alpha: 0, duration: 420, ease: 'quad.out' });
  }

  setCombo(c) {
    if (c < 3) { this.comboText.setVisible(false); return; }
    this.comboText.setVisible(true).setText(`${c}x COMBO`);
    const heat = Math.min(c / 40, 1);
    this.comboText.setColor(heat > 0.7 ? '#ff5347' : heat > 0.35 ? '#ff9c3f' : '#ffe94d');
    this.comboText.setScale(1 + heat * 0.4);
    this.tweens.add({ targets: this.comboText, scale: this.comboText.scale * 1.2, duration: 70, yoyo: true });
  }

  setDashCd() { /* arc redraws every frame in update() */ }

  // live relic-board strip
  setRelics(relics, maxSlots) {
    this.slotIcons.forEach(o => o.destroy());
    this.slotIcons = [];
    for (let i = 0; i < maxSlots; i++) {
      const x = 26 + i * 40;
      const slot = this.add.circle(x, this.slotY, 17, 0x000000, 0.45).setStrokeStyle(2, 0x2c3f66).setDepth(2);
      this.slotIcons.push(slot);
      if (relics[i]) {
        const r = relics[i];
        const icon = this.add.image(x, this.slotY, 'relic').setTint(r.def.color).setScale(0.8).setDepth(3);
        const tierDot = this.add.circle(x + 11, this.slotY + 11, 5, SS.TIERS[r.tier].color).setDepth(4);
        this.slotIcons.push(icon, tierDot);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Boss bar
  // --------------------------------------------------------------------------
  showBossBar(max, name = 'T I T A N', color = 0xff5347) {
    this.bossLabel.setText(name).setColor('#' + color.toString(16).padStart(6, '0'));
    this.bossBar.setFillStyle(color);
    this.bossBarBg.setVisible(true); this.bossBar.setVisible(true); this.bossLabel.setVisible(true);
    this.setBossHp(max, max);
  }

  // Big dramatic boss announcement: name slams in, shakes, fades
  bossBanner(name, color = 0xff5347) {
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(W / 2, H * 0.32).setDepth(28);
    const warn = this.add.text(0, -34, '— TITAN INCOMING —', {
      fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ff5347'
    }).setOrigin(0.5);
    const big = this.add.text(0, 6, name, {
      fontFamily: 'Arial Black, Arial', fontSize: '38px',
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5).setShadow(0, 4, '#000000cc', 6);
    c.add([warn, big]);
    c.setScale(3).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'back.out' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 40, delay: 1900, duration: 450, onComplete: () => c.destroy() });
  }
  setBossHp(hp, max) { this.bossBar.width = Math.max(0, this.bossBarW * (hp / max)); }
  hideBossBar() {
    this.bossBarBg.setVisible(false); this.bossBar.setVisible(false); this.bossLabel.setVisible(false);
  }

  // --------------------------------------------------------------------------
  // Toast notifications (achievements, boss warnings, merges…)
  // --------------------------------------------------------------------------
  toast(msg, color = 0xffffff) {
    const W = this.scale.width;
    const t = this.add.text(W / 2, this.toastY, msg, {
      fontFamily: 'Arial Black, Arial', fontSize: '18px',
      color: '#' + color.toString(16).padStart(6, '0'),
      backgroundColor: '#000000aa', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setDepth(20).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: this.toastY - 30, delay: 1800, duration: 400, onComplete: () => t.destroy() });
  }

  // --------------------------------------------------------------------------
  // LEVEL-UP DRAFT — 3 cards, pick one (GameScene is paused meanwhile)
  // --------------------------------------------------------------------------
  showLevelUp(choices, cb) {
    this.choosing = true;
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(30);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8).setInteractive());
    // radial glow behind everything — the moment feels like an altar
    const bgGlow = this.add.image(W / 2, H / 2, 'glow').setTint(0x53e05a).setScale(14).setAlpha(0.35);
    c.add(bgGlow);

    const bestRarity = Math.max(...choices.map(u => u.rarity));
    if (bestRarity >= 3) { SS.Audio.play('legend'); bgGlow.setTint(0xffd34d).setAlpha(0.5); }
    else if (bestRarity >= 2) bgGlow.setTint(0xb45dff).setAlpha(0.45);

    const hdr = this.add.container(W / 2, H * 0.15).setScale(0);
    hdr.add(this.add.image(0, -30, 'ic_arrowup').setDisplaySize(30, 30).setTint(0x53e05a));
    hdr.add(this.add.text(0, 2, 'CHOOSE YOUR POWER', {
      fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffffff'
    }).setOrigin(0.5).setShadow(0, 3, '#000', 5));
    hdr.add(this.add.text(0, 26, `LEVEL ${this.game_.level}`, {
      fontFamily: 'Arial', fontSize: '13px', color: '#53e05a'
    }).setOrigin(0.5));
    c.add(hdr);
    this.tweens.add({ targets: hdr, scale: 1, duration: 300, ease: 'back.out' });

    const vertical = W < 640; // stack cards on narrow screens
    const cw = vertical ? Math.min(340, W * 0.86) : Math.min(210, W / 3.5);
    const ch = vertical ? 100 : 260;

    choices.forEach((u, i) => {
      const rar = SS.RARITY[u.rarity];
      const x = vertical ? W / 2 : W / 2 + (i - 1) * (cw + 22);
      const y = vertical ? H * 0.35 + i * (ch + 16) : H * 0.52;
      const card = this.add.container(x, y);
      // rarity aura behind epic/legendary cards
      if (u.rarity >= 2) {
        const aura = this.add.image(0, 0, 'glow').setTint(rar.color)
          .setScale(vertical ? 5 : 4.5).setAlpha(0.55);
        card.add(aura);
        this.tweens.add({ targets: aura, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
      }
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-cw / 2 + 3, -ch / 2 + 5, cw, ch, 16);
      bg.fillStyle(SS.COLORS.panelLight, 1);
      bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 16);
      bg.fillStyle(rar.color, u.rarity >= 2 ? 0.13 : 0.06);
      bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 16);
      bg.lineStyle(u.rarity >= 2 ? 3.5 : 2.5, rar.color, 1);
      bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 16);
      // rarity ribbon across the top
      const ribbon = this.add.graphics();
      ribbon.fillStyle(rar.color, 0.9);
      ribbon.fillRoundedRect(-cw / 2, -ch / 2, cw, 22, { tl: 16, tr: 16, bl: 0, br: 0 });
      const rarTxt = this.add.text(0, -ch / 2 + 11, rar.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '11px', color: u.rarity >= 3 ? '#3d2b00' : '#0a0e1a'
      }).setOrigin(0.5);
      // icon in a glowing badge
      const iy = vertical ? 8 : -ch / 2 + 74;
      const ix = vertical ? -cw / 2 + 40 : 0;
      const badgeGlow = this.add.image(ix, iy, 'glow').setTint(rar.color).setScale(1.4).setAlpha(0.9);
      const iconBadge = this.add.circle(ix, iy, 27, rar.color, 0.22).setStrokeStyle(2, rar.color, 0.8);
      const icon = this.add.image(ix, iy, u.icon).setDisplaySize(34, 34).setTint(0xffffff);
      const name = this.add.text(vertical ? -cw / 2 + 78 : 0, vertical ? -10 : 4, u.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff'
      }).setOrigin(vertical ? 0 : 0.5, 0.5).setShadow(0, 2, '#000a', 3);
      const desc = this.add.text(vertical ? -cw / 2 + 78 : 0, vertical ? 16 : 44, u.desc, {
        fontFamily: 'Arial', fontSize: '13px', color: '#b9c6de',
        wordWrap: { width: cw - (vertical ? 96 : 26) }, align: vertical ? 'left' : 'center'
      }).setOrigin(vertical ? 0 : 0.5, 0.5);
      card.add([bg, ribbon, rarTxt, badgeGlow, iconBadge, icon, name, desc]);
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.setScale(0);
      // legendary cards slam in last with extra drama
      const delay = 120 + i * 130 + (u.rarity >= 3 ? 200 : 0);
      this.tweens.add({ targets: card, scale: 1, duration: 320, delay, ease: 'back.out' });
      if (u.rarity >= 2) {
        this.tweens.add({ targets: card, y: y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout', delay: delay + 320 });
      }
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.07, duration: 90 }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 90 }));
      card.on('pointerdown', () => {
        SS.Audio.play(u.rarity >= 2 ? 'legend' : 'buy');
        this.choosing = false;
        // chosen-card flourish: pop + ring, then hand control back
        const ring = this.add.image(x, y, 'ring').setTint(rar.color).setDepth(31).setScale(1);
        this.tweens.add({ targets: ring, scale: 8, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        c.destroy();
        cb(u);
      });
      c.add(card);
    });
  }

  // --------------------------------------------------------------------------
  // PAUSE MENU
  // --------------------------------------------------------------------------
  togglePause() {
    if (this.choosing || this.game_.gameOver) return;
    if (this.paused) return this.unpause();
    this.paused = true;
    this.game_.physics.world.isPaused = true;
    this.game_.time.paused = true;

    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(40);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    c.add(SS.makePanel(this, W / 2, H / 2, Math.min(340, W * 0.9), 380));
    c.add(this.add.image(W / 2 - 78, H / 2 - 150, 'ic_pause').setDisplaySize(24, 24));
    c.add(this.add.text(W / 2 - 56, H / 2 - 150, 'PAUSED', {
      fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffffff'
    }).setOrigin(0, 0.5));

    const s = SS.Save.data.settings;
    const mkToggle = (label, key, y) => {
      const t = this.add.text(W / 2 - 130, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#fff' }).setOrigin(0, 0.5);
      const b = SS.makeButton(this, W / 2 + 90, y, 80, 34, s[key] ? 'ON' : 'OFF', s[key] ? 0x1f9e55 : 0x83354a, () => {
        s[key] = !s[key]; SS.Save.save();
        b.labelText.setText(s[key] ? 'ON' : 'OFF');
        c.destroy(); this.paused = false; this.togglePause(); // rebuild for color refresh
      }, 13);
      c.add([t, b]);
    };
    mkToggle('Sound', 'sound', H / 2 - 90);
    mkToggle('Music', 'music', H / 2 - 44);
    mkToggle('Shake', 'shake', H / 2 + 2);

    c.add(SS.makeButton(this, W / 2, H / 2 + 70, 240, 48, 'RESUME', 0x1f9e55, () => this.unpause(), 18, 'ic_play'));
    c.add(SS.makeButton(this, W / 2, H / 2 + 130, 240, 42, 'QUIT TO MENU', 0x83354a, () => {
      this.paused = false;
      // banking partial progress: gold earned so far is kept (generous = retention)
      SS.Save.data.gold += this.game_.gold;
      SS.Save.data.stats.totalGold += this.game_.gold;
      SS.Save.save();
      this.scene.stop('Game');
      this.scene.stop('GameOver');
      this.scene.stop();
      this.scene.start('Menu');
    }, 15, 'ic_home'));
    this.pauseOverlay = c;
  }

  unpause() {
    this.paused = false;
    if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
    this.game_.physics.world.isPaused = false;
    this.game_.time.paused = false;
  }
}
