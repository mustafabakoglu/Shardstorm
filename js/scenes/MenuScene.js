// ============================================================================
// SHARDSTORM — MenuScene
// Modern hub UI: glowing logo, currency pills, stats card, hero PLAY button,
// bottom icon dock (shop / pets / missions / achievements / settings),
// glass modals with vector icons throughout. No emojis, no retro.
// ============================================================================

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    // Re-layout on window resize (debounced scene restart)
    this.scale.on('resize', this.queueRelayout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.queueRelayout, this));

    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(SS.COLORS.bg);
    this.overlay = null;

    // ---- backdrop: faint grid + big soft glows + drifting shards ---------------
    const grid = this.add.graphics().setAlpha(0.5);
    grid.lineStyle(1, SS.COLORS.grid, 1);
    for (let x = 0; x <= W; x += 70) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 70) grid.lineBetween(0, y, W, y);
    [[W * 0.2, H * 0.25, 0x123c5c], [W * 0.85, H * 0.15, 0x2a1a4d], [W * 0.5, H * 0.95, 0x0e2f4a]]
      .forEach(([x, y, c]) => this.add.image(x, y, 'glow').setTint(c).setScale(10).setAlpha(0.75));
    // slow-rotating giant ring behind the hero showcase — depth without noise
    const bigRing = this.add.image(W / 2, H * 0.30, 'ring').setTint(0x1b2a47).setScale(7).setAlpha(0.6);
    this.tweens.add({ targets: bigRing, angle: 360, duration: 60000, repeat: -1 });
    // drifting relic shards floating upward (thematic dust)
    for (let i = 0; i < 12; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'relic')
        .setScale(Phaser.Math.FloatBetween(0.2, 0.45)).setAlpha(Phaser.Math.FloatBetween(0.05, 0.16))
        .setTint(Phaser.Math.RND.pick([0x4de1ff, 0xb45dff, 0xff9c3f]))
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: s, y: s.y - Phaser.Math.Between(60, 140), angle: s.angle + 120, alpha: 0,
        duration: Phaser.Math.Between(5000, 10000), repeat: -1,
        onRepeat: () => { s.y = H + 20; s.x = Phaser.Math.Between(0, W); s.alpha = Phaser.Math.FloatBetween(0.05, 0.16); }
      });
    }
    for (let i = 0; i < 26; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'dot')
        .setScale(Phaser.Math.FloatBetween(0.15, 0.5)).setAlpha(Phaser.Math.FloatBetween(0.04, 0.2)).setTint(0x9fd8ff);
      this.tweens.add({
        targets: s, y: s.y - Phaser.Math.Between(30, 80), alpha: 0,
        duration: Phaser.Math.Between(3000, 7000), repeat: -1,
        onRepeat: () => { s.y = H + 10; s.x = Phaser.Math.Between(0, W); s.alpha = Phaser.Math.FloatBetween(0.04, 0.2); }
      });
    }

    // ---- logo block -------------------------------------------------------------
    const logoY = H * 0.13;
    const fs = Math.min(60, W / 8);
    const t1 = this.add.text(W / 2, logoY, 'SHARD', {
      fontFamily: 'Arial Black, Arial', fontSize: fs + 'px', color: '#ffffff'
    }).setOrigin(1, 0.5).setShadow(0, 4, '#00131f', 10);
    const t2 = this.add.text(W / 2, logoY, 'STORM', {
      fontFamily: 'Arial Black, Arial', fontSize: fs + 'px', color: '#4de1ff'
    }).setOrigin(0, 0.5).setShadow(0, 4, '#0a3448', 10);
    this.add.text(W / 2, logoY + fs * 0.72, 'F O R G E   Y O U R   S T O R M', {
      fontFamily: 'Arial', fontSize: '13px', color: '#5f7397'
    }).setOrigin(0.5);
    this.tweens.add({ targets: [t1, t2], y: '-=5', duration: 2200, yoyo: true, repeat: -1, ease: 'sine.inout' });
    // shine streak sweeping across the logo every few seconds
    const shine = this.add.image(W / 2 - fs * 3, logoY, 'glow').setTint(0xffffff).setScale(1.6, 2.6).setAlpha(0);
    this.time.addEvent({
      delay: 3400, loop: true, callback: () => {
        shine.setX(W / 2 - fs * 3).setAlpha(0.5);
        this.tweens.add({ targets: shine, x: W / 2 + fs * 3, alpha: 0, duration: 700, ease: 'quad.in' });
      }
    });

    // ---- LIVE HERO SHOWCASE — the hero with orbiting relics, mowing idly --------
    const showY = H * 0.30;
    this.add.image(W / 2, showY + 26, 'shadow').setScale(1.4).setAlpha(0.7);
    this.add.image(W / 2, showY, 'hero_core').setScale(2.4).setAlpha(0.9);
    const showHero = this.add.image(W / 2, showY, 'hero').setScale(1.35);
    this.tweens.add({ targets: showHero, scaleX: 1.42, scaleY: 1.28, duration: 700, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.showcase = { x: W / 2, y: showY, angle: 0, shards: [] };
    const showTypes = ['bolt', 'blade', 'frost', 'ember'];
    showTypes.forEach((k, i) => {
      const spr = this.add.image(W / 2, showY, 'relic').setTint(SS.RELICS[k].color).setScale(0.85);
      const glow = this.add.image(W / 2, showY, 'glow').setTint(SS.RELICS[k].color).setScale(0.55).setAlpha(0.8).setDepth(-0.1);
      this.showcase.shards.push({ spr, glow, off: (i / showTypes.length) * Math.PI * 2 });
    });

    // ---- currency pills (top-left) -----------------------------------------------
    this.goldPill = SS.makePill(this, 12, 26, 'gold', 0xffffff, SS.fmt(SS.Save.data.gold));
    this.gemPill = SS.makePill(this, 12, 62, 'gem', 0xffffff, SS.fmt(SS.Save.data.gems));

    // ---- stats card -----------------------------------------------------------------
    const st = SS.Save.data.stats;
    const cardY = H * 0.46;
    const cardW = Math.min(380, W * 0.9);
    SS.makePanel(this, W / 2, cardY, cardW, 70, 0x0f1729, 0.9);
    const stats = [
      ['ic_clock', `${Math.floor(st.bestTime / 60)}:${String(Math.floor(st.bestTime % 60)).padStart(2, '0')}`, 'BEST TIME', 0x4de1ff],
      ['ic_arrowup', 'Lv ' + st.bestLevel, 'BEST LEVEL', 0x53e05a],
      ['ic_skull', SS.fmt(st.totalKills), 'KILLS', 0xff6bd6],
      ['ic_trophy', SS.fmt(st.bossKills || 0), 'TITANS', 0xffd34d]
    ];
    stats.forEach((s, i) => {
      const x = W / 2 + (i - 1.5) * (cardW / 4.15);
      this.add.image(x, cardY - 10, s[0]).setDisplaySize(16, 16).setTint(s[3]);
      this.add.text(x, cardY + 8, s[1], { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#e8edf5' }).setOrigin(0.5);
      this.add.text(x, cardY + 24, s[2], { fontFamily: 'Arial', fontSize: '8px', color: '#5f7397' }).setOrigin(0.5);
      if (i < stats.length - 1) {
        this.add.rectangle(x + cardW / 8.3, cardY, 1.5, 40, 0x2b3c5f);
      }
    });

    // ---- hero PLAY button --------------------------------------------------------------
    const play = SS.makeButton(this, W / 2, H * 0.585, Math.min(320, W * 0.8), 72, 'PLAY', 0x11a05a, () => {
      SS.Audio.startMusic();
      this.scene.start('Game');
    }, 28, 'ic_play');
    const playGlow = this.add.image(play.x, play.y, 'glow').setTint(0x2de07a).setScale(5).setAlpha(0.45).setDepth(-1);
    this.tweens.add({ targets: playGlow, scale: 5.8, alpha: 0.25, duration: 750, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.tweens.add({ targets: play, scale: { from: 1, to: 1.045 }, duration: 750, yoyo: true, repeat: -1, ease: 'sine.inout' });
    // pulsing ring radiating from the play button
    this.time.addEvent({
      delay: 1500, loop: true, callback: () => {
        const r = this.add.image(play.x, play.y, 'ring').setTint(0x2de07a).setScale(1.2).setAlpha(0.5).setDepth(-1);
        this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 900, onComplete: () => r.destroy() });
      }
    });

    // ---- bottom navigation dock --------------------------------------------------------
    const dockY = H - Math.max(64, H * 0.09);
    const dockW = Math.min(400, W * 0.95);
    const dockPanel = this.add.graphics();
    dockPanel.fillStyle(0x0d1425, 0.92);
    dockPanel.fillRoundedRect(W / 2 - dockW / 2, dockY - 36, dockW, 82, 22);
    dockPanel.lineStyle(1.5, 0x2b3c5f, 1);
    dockPanel.strokeRoundedRect(W / 2 - dockW / 2, dockY - 36, dockW, 82, 22);
    const nav = [
      ['ic_bag', 0x2c5faa, 'SHOP', () => this.openShop()],
      ['ic_paw', 0x8a4dbf, 'PETS', () => this.openPets()],
      ['ic_scroll', 0xb0722c, 'MISSIONS', () => this.openMissions()],
      ['ic_trophy', 0xa8842c, 'AWARDS', () => this.openAchievements()],
      ['ic_gear', 0x3d4a66, 'SETTINGS', () => this.openSettings()]
    ];
    nav.forEach((n, i) => {
      const x = W / 2 - dockW / 2 + dockW * ((i + 0.5) / nav.length);
      SS.makeIconButton(this, x, dockY - 4, 22, n[0], n[1], n[3], n[2]);
    });

    // ---- mission-ready badge on the dock (curiosity hook) --------------------------------
    const md = SS.Save.data.missions;
    const claimable = md.list.some(mid => {
      const m = SS.MISSION_POOL.find(x => x.id === mid);
      return m && (md.progress[mid] || 0) >= m.target && !md.claimed.includes(mid);
    });
    if (claimable) {
      const bx = W / 2 - dockW / 2 + dockW * 0.5 + 16, by = dockY - 22;
      const badge = this.add.circle(bx, by, 6, 0xff5347).setDepth(6);
      this.tweens.add({ targets: badge, scale: 1.4, duration: 500, yoyo: true, repeat: -1 });
    }

    // ---- daily reward popup ---------------------------------------------------------------
    if (SS.Save.dailyAvailable()) this.time.delayedCall(450, () => this.openDaily());
    SS.Save.checkPets();
  }

  queueRelayout() {
    if (this.relayoutTimer) this.relayoutTimer.remove();
    this.relayoutTimer = this.time.delayedCall(120, () => this.scene.restart());
  }

  // Animate the hero showcase's orbiting relic shards
  update(time, delta) {
    if (!this.showcase) return;
    this.showcase.angle += (delta / 1000) * 1.4;
    const R = 56;
    for (const sh of this.showcase.shards) {
      const a = this.showcase.angle + sh.off;
      sh.spr.setPosition(this.showcase.x + Math.cos(a) * R, this.showcase.y + Math.sin(a) * R * 0.6);
      sh.glow.setPosition(sh.spr.x, sh.spr.y);
      sh.spr.rotation += delta / 400;
      // fake depth: shards in "front" render bigger
      const depth = Math.sin(a);
      sh.spr.setScale(0.75 + depth * 0.2).setDepth(depth > 0 ? 1 : -0.2);
      sh.glow.setScale(0.5 + depth * 0.12).setDepth(depth > 0 ? 0.9 : -0.3);
    }
  }

  refreshCurrency() {
    this.goldPill.valueText.setText(SS.fmt(SS.Save.data.gold));
    this.gemPill.valueText.setText(SS.fmt(SS.Save.data.gems));
  }

  // --------------------------------------------------------------------------
  // Modal scaffold: dim + glass panel + icon header + close
  // --------------------------------------------------------------------------
  openModal(titleStr, h, iconKey = null, iconTint = 0x4de1ff) {
    if (this.overlay) this.overlay.destroy();
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x04070f, 0.78).setInteractive();
    const pw = Math.min(430, W * 0.94), ph = Math.min(h, H * 0.92);
    const panel = SS.makePanel(this, W / 2, H / 2, pw, ph);
    const hx = W / 2 - pw / 2 + 24;
    const parts = [dim, panel];
    if (iconKey) parts.push(this.add.image(hx, H / 2 - ph / 2 + 30, iconKey).setDisplaySize(22, 22).setTint(iconTint));
    parts.push(this.add.text(hx + (iconKey ? 32 : 0), H / 2 - ph / 2 + 30, titleStr, {
      fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0, 0.5));
    // divider under header
    const div = this.add.graphics();
    div.lineStyle(1.5, 0x2b3c5f, 1);
    div.lineBetween(W / 2 - pw / 2 + 16, H / 2 - ph / 2 + 54, W / 2 + pw / 2 - 16, H / 2 - ph / 2 + 54);
    parts.push(div);
    parts.push(SS.makeIconButton(this, W / 2 + pw / 2 - 28, H / 2 - ph / 2 + 30, 15, 'ic_x', 0x83354a, () => {
      c.destroy(); this.overlay = null;
    }));
    c.add(parts);
    c.pw = pw; c.ph = ph; c.cx = W / 2; c.cy = H / 2;
    c.setScale(0.88).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'back.out' });
    this.overlay = c;
    return c;
  }

  // Icon in a rounded color badge — shared row visual
  rowBadge(c, x, y, icon, color, size = 40) {
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 12);
    bg.lineStyle(1.5, color, 0.55);
    bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 12);
    const img = this.add.image(x, y, icon).setDisplaySize(size * 0.55, size * 0.55).setTint(0xffffff);
    c.add([bg, img]);
  }

  // --- META SHOP -------------------------------------------------------------
  openShop() {
    const m = this.openModal('PERMANENT UPGRADES', 700, 'ic_bag');
    const top = m.cy - m.ph / 2 + 92;
    const rowH = Math.min(62, (m.ph - 120) / SS.META.length);
    SS.META.forEach((meta, i) => {
      const y = top + i * rowH;
      const lvl = SS.Save.metaLevel(meta.id);
      const maxed = lvl >= meta.max;
      const cost = SS.metaCost(meta, lvl);
      this.rowBadge(m, m.cx - m.pw / 2 + 40, y, meta.icon, maxed ? 0xffd34d : 0x2c5faa, Math.min(42, rowH - 14));
      const name = this.add.text(m.cx - m.pw / 2 + 72, y - 11, meta.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      // level pips
      const pips = this.add.graphics();
      for (let p = 0; p < meta.max; p++) {
        pips.fillStyle(p < lvl ? 0x4de1ff : 0x24314e, 1);
        pips.fillRoundedRect(m.cx - m.pw / 2 + 72 + p * 13, y + 1, 9, 5, 2);
      }
      const desc = this.add.text(m.cx - m.pw / 2 + 72, y + 15, meta.desc, {
        fontFamily: 'Arial', fontSize: '11px', color: '#7a8db0'
      }).setOrigin(0, 0.5);
      const btn = SS.makeButton(this, m.cx + m.pw / 2 - 60, y, 92, Math.min(40, rowH - 16),
        maxed ? 'MAX' : SS.fmt(cost), maxed ? 0x3d4a66 : 0x11a05a, () => {
          if (SS.Save.buyMeta(meta)) {
            SS.Audio.play('buy'); this.refreshCurrency();
            m.destroy(); this.overlay = null; this.openShop();
          } else SS.Audio.play('error');
        }, 13, maxed ? null : 'ic_coin');
      if (!maxed && btn.iconImg) btn.iconImg.setTint(0xffd34d);
      m.add([name, pips, desc, btn]);
    });
  }

  // --- PETS --------------------------------------------------------------------
  openPets() {
    const m = this.openModal('PETS', 500, 'ic_paw');
    const top = m.cy - m.ph / 2 + 104;
    const pdata = SS.Save.data.pets;
    SS.PETS.forEach((pet, i) => {
      const y = top + i * 92;
      const unlocked = pdata.unlocked.includes(pet.id);
      const active = pdata.active === pet.id;
      const icon = this.add.image(m.cx - m.pw / 2 + 44, y, 'pet')
        .setTint(unlocked ? pet.color : 0x333c52).setScale(1.7);
      if (active) {
        const ring = this.add.graphics();
        ring.lineStyle(2.5, 0x4de1ff, 1);
        ring.strokeCircle(m.cx - m.pw / 2 + 44, y, 26);
        m.add(ring);
      }
      const name = this.add.text(m.cx - m.pw / 2 + 82, y - 16, pet.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '16px', color: unlocked ? '#ffffff' : '#5a6a8f'
      }).setOrigin(0, 0.5);
      const lockIcon = unlocked ? null : this.add.image(m.cx - m.pw / 2 + 82, y + 8, 'ic_lock').setDisplaySize(12, 12).setTint(0x5a6a8f).setOrigin(0, 0.5);
      const desc = this.add.text(m.cx - m.pw / 2 + (unlocked ? 82 : 100), y + 8, unlocked ? pet.desc : pet.unlock, {
        fontFamily: 'Arial', fontSize: '11px', color: '#7a8db0', wordWrap: { width: m.pw - 210 }
      }).setOrigin(0, 0.5);
      const btn = SS.makeButton(this, m.cx + m.pw / 2 - 58, y, 88, 38,
        active ? 'ACTIVE' : unlocked ? 'EQUIP' : 'LOCKED', active ? 0x11a05a : unlocked ? 0x2c5faa : 0x3d4a66, () => {
          if (!unlocked) { SS.Audio.play('error'); return; }
          pdata.active = active ? null : pet.id; SS.Save.save();
          m.destroy(); this.overlay = null; this.openPets();
        }, 12);
      m.add([icon, name, desc, btn]);
      if (lockIcon) m.add(lockIcon);
    });
  }

  // --- MISSIONS ------------------------------------------------------------------
  openMissions() {
    const m = this.openModal('DAILY MISSIONS', 400, 'ic_scroll');
    const top = m.cy - m.ph / 2 + 104;
    const md = SS.Save.data.missions;
    md.list.forEach((mid, i) => {
      const mission = SS.MISSION_POOL.find(x => x.id === mid);
      if (!mission) return;
      const y = top + i * 86;
      const prog = Math.min(md.progress[mid] || 0, mission.target);
      const done = prog >= mission.target;
      const claimed = md.claimed.includes(mid);
      this.rowBadge(m, m.cx - m.pw / 2 + 40, y, 'ic_scroll', done ? 0x11a05a : 0xb0722c, 40);
      const name = this.add.text(m.cx - m.pw / 2 + 68, y - 16, mission.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      const barW = m.pw - 220;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x0a0e1a, 1); barBg.fillRoundedRect(m.cx - m.pw / 2 + 68, y + 4, barW, 10, 5);
      if (prog > 0) {
        barBg.fillStyle(done ? 0x53e05a : 0x4de1ff, 1);
        barBg.fillRoundedRect(m.cx - m.pw / 2 + 68, y + 4, Math.max(10, barW * (prog / mission.target)), 10, 5);
      }
      const progText = this.add.text(m.cx - m.pw / 2 + 68 + barW + 8, y + 9, `${SS.fmt(prog)}/${SS.fmt(mission.target)}`, {
        fontFamily: 'Arial', fontSize: '10px', color: '#7a8db0'
      }).setOrigin(0, 0.5);
      const btn = SS.makeButton(this, m.cx + m.pw / 2 - 54, y - 12, 82, 34,
        claimed ? 'DONE' : done ? `${mission.gold}` : '· · ·', claimed ? 0x3d4a66 : done ? 0x11a05a : 0x3d4a66, () => {
          if (done && !claimed) {
            md.claimed.push(mid);
            SS.Save.data.gold += mission.gold; SS.Save.save();
            SS.Audio.play('buy'); this.refreshCurrency();
            m.destroy(); this.overlay = null; this.openMissions();
          }
        }, 12, done && !claimed ? 'ic_coin' : null);
      if (btn.iconImg) btn.iconImg.setTint(0xffd34d);
      m.add([name, barBg, progText, btn]);
    });
  }

  // --- ACHIEVEMENTS -----------------------------------------------------------------
  openAchievements() {
    const m = this.openModal('ACHIEVEMENTS', 700, 'ic_trophy');
    const top = m.cy - m.ph / 2 + 86;
    const unlocked = SS.Save.data.ach;
    const rowH = Math.min(40, (m.ph - 120) / SS.ACHIEVEMENTS.length);
    SS.ACHIEVEMENTS.forEach((a, i) => {
      const y = top + i * rowH;
      const got = unlocked.includes(a.id);
      const tro = this.add.image(m.cx - m.pw / 2 + 30, y, 'ic_trophy')
        .setDisplaySize(17, 17).setTint(got ? 0xffd34d : 0x333c52);
      const t = this.add.text(m.cx - m.pw / 2 + 48, y, a.name, {
        fontFamily: 'Arial Black, Arial', fontSize: '13px', color: got ? '#ffd34d' : '#5a6a8f'
      }).setOrigin(0, 0.5);
      const d = this.add.text(m.cx + m.pw / 2 - 48, y, a.desc, {
        fontFamily: 'Arial', fontSize: '10px', color: '#7a8db0'
      }).setOrigin(1, 0.5);
      const gemIc = this.add.image(m.cx + m.pw / 2 - 34, y, 'ic_gem').setDisplaySize(13, 13)
        .setTint(got ? 0x5dffc8 : 0x333c52);
      const gemN = this.add.text(m.cx + m.pw / 2 - 24, y, '' + a.gem, {
        fontFamily: 'Arial Black, Arial', fontSize: '11px', color: got ? '#5dffc8' : '#5a6a8f'
      }).setOrigin(0, 0.5);
      m.add([tro, t, d, gemIc, gemN]);
    });
  }

  // --- SETTINGS ----------------------------------------------------------------------
  openSettings() {
    const m = this.openModal('SETTINGS', 380, 'ic_gear');
    const s = SS.Save.data.settings;
    const rows = [['Sound Effects', 'sound'], ['Music', 'music'], ['Screen Shake', 'shake']];
    rows.forEach((r, i) => {
      const y = m.cy - 62 + i * 56;
      const label = this.add.text(m.cx - m.pw / 2 + 28, y, r[0], {
        fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      const btn = SS.makeButton(this, m.cx + m.pw / 2 - 66, y, 92, 40,
        s[r[1]] ? 'ON' : 'OFF', s[r[1]] ? 0x11a05a : 0x83354a, () => {
          s[r[1]] = !s[r[1]]; SS.Save.save();
          m.destroy(); this.overlay = null; this.openSettings();
        }, 14);
      m.add([label, btn]);
    });
    const reset = SS.makeButton(this, m.cx, m.cy + m.ph / 2 - 44, 210, 38, 'RESET SAVE', 0x83354a, () => {
      localStorage.removeItem(SS.Save.KEY);
      SS.Save.load();
      this.scene.restart();
    }, 12, 'ic_x');
    m.add(reset);
  }

  // --- DAILY REWARD -------------------------------------------------------------------
  openDaily() {
    const m = this.openModal('DAILY REWARD', 360, 'ic_star', 0xffd34d);
    const streakNext = (SS.Save.data.daily.lastClaim === new Date(Date.now() - 864e5).toISOString().slice(0, 10))
      ? SS.Save.data.daily.streak + 1 : 1;
    const reward = SS.DAILY_REWARDS[(streakNext - 1) % 7];
    // 7-day streak strip
    for (let d = 0; d < 7; d++) {
      const x = m.cx - 3 * 46 + d * 46;
      const active = d === (streakNext - 1) % 7;
      const done = d < (streakNext - 1) % 7;
      const cell = this.add.graphics();
      cell.fillStyle(active ? 0x1d3a2a : 0x0d1425, 1);
      cell.fillRoundedRect(x - 19, m.cy - 66, 38, 44, 8);
      cell.lineStyle(1.5, active ? 0x53e05a : done ? 0x3a5f43 : 0x2b3c5f, 1);
      cell.strokeRoundedRect(x - 19, m.cy - 66, 38, 44, 8);
      const ic = this.add.image(x, m.cy - 52, 'gold').setScale(0.8).setAlpha(done || active ? 1 : 0.4);
      const nn = this.add.text(x, m.cy - 32, SS.fmt(SS.DAILY_REWARDS[d]), {
        fontFamily: 'Arial', fontSize: '9px', color: active ? '#ffd34d' : '#5a6a8f'
      }).setOrigin(0.5);
      m.add([cell, ic, nn]);
    }
    const icon = this.add.image(m.cx, m.cy + 8, 'gold').setScale(2.6);
    this.tweens.add({ targets: icon, angle: 10, scale: 2.9, duration: 500, yoyo: true, repeat: -1 });
    const txt = this.add.text(m.cx, m.cy + 48, `Day ${streakNext} streak — ${reward} gold`, {
      fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffd34d'
    }).setOrigin(0.5);
    const btn = SS.makeButton(this, m.cx, m.cy + m.ph / 2 - 48, 190, 48, 'CLAIM', 0x11a05a, () => {
      SS.Save.claimDaily();
      SS.Audio.play('buy');
      this.refreshCurrency();
      m.destroy(); this.overlay = null;
    }, 17, 'ic_star');
    m.add([icon, txt, btn]);
  }
}
