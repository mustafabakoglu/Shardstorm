// ============================================================================
// SHARDSTORM — GameScene
// The entire run: player, orbit-relic merge system, enemies, bosses, loot,
// XP/level draft, combo, pets, and all the juice (shake, hit-stop, slow-mo,
// particles, damage numbers). Heavy use of object pools for 60 FPS.
// ============================================================================

const WORLD = 2600;               // square world size
const ORBIT_BASE_R = 74;          // base relic orbit radius

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  // ==========================================================================
  // CREATE
  // ==========================================================================
  create() {
    // Safe UI stub: swallows every call until UIScene registers itself
    // (UIScene.create runs one tick after launch — and the first relic is
    // forged before that). Method calls become no-ops, flag reads are false.
    const noop = () => {};
    this.ui = new Proxy({}, { get: (t, k) => (k === 'paused' || k === 'choosing') ? false : noop });

    this.buildStats();
    this.createWorld();
    this.createPlayer();
    this.createGroups();
    this.createPools();
    this.createInput();
    this.createPet();

    // ---- run state ----------------------------------------------------------
    this.runTime = 0;             // seconds survived
    this.level = 1;
    this.xp = 0;
    this.xpNeed = 20;
    this.gold = 0;                // gold earned this run (banked on death)
    this.gems = 0;
    this.kills = 0;
    this.merges = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bossCount = 0;
    this.boss = null;
    this.nextBossAt = 60;         // seconds — Titans come thick and fast
    this.revives = SS.Save.metaLevel('revive');
    this.gameOver = false;
    this.slowFactor = 1;          // 1 = normal, <1 = slow-motion
    this.relics = [];             // orbiting relic ring (the merge board)
    this.maxSlots = 4 + SS.Save.metaLevel('slot');
    this.orbitAngle = 0;

    // ---- recurring timers ----------------------------------------------------
    this.spawnEvent = this.time.addEvent({ delay: 800, loop: true, callback: () => this.spawnEnemy() });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.everySecond() });

    // Start strong: an Uncommon Bolt AND a Blade — the player mows from second
    // zero. Head Start meta adds extra random relics on top.
    this.addRelic('bolt', 1, true);
    this.addRelic('blade', 0, true);
    for (let i = 0; i < SS.Save.metaLevel('starter'); i++) this.addRelic(SS.randomRelicType(), 0, true);

    // make sure the soundtrack is rolling even if the menu path missed it
    SS.Audio.startMusic();

    // Launch the HUD scene on top (it assigns itself to this.ui when ready)
    this.scene.launch('UI');

    // Intro pop
    this.cameras.main.fadeIn(400);
  }

  // Build run stats from base values + permanent meta upgrades + pets
  buildStats() {
    const ml = id => SS.Save.metaLevel(id);
    const pet = SS.Save.data.pets.active;
    this.stats = {
      maxHp: 120 + ml('vit') * 20,
      hp: 0,
      dmgMult: 1.3 * (1 + ml('pow') * 0.08),   // generous base — the hero HITS
      atkSpeed: 1.15,
      moveSpeed: 240 * (1 + ml('swift') * 0.04),
      magnet: 110 * (1 + ml('magnet') * 0.15),
      goldMult: (1 + ml('fortune') * 0.10) * (pet === 'nyx' ? 1.25 : 1),
      xpMult: 1 + ml('wisdom') * 0.08,
      critChance: 0.05 + ml('crit') * 0.03,
      critDmg: 1.5,
      regen: 0,
      projCount: 1,
      dashCd: 2000,
      orbitSpeed: 1,
      orbitRadius: 1,
      thorns: 0,        // reflect multiplier on touch damage
      lifesteal: 0,     // HP healed per kill
      shieldMax: 0,     // hits blocked (recharges every 12s)
      area: 1,          // ability area multiplier (frost/ember/vortex/blade)
      armor: 0,         // % damage reduction (0..0.7)
      dodge: 0,         // chance to ignore a hit entirely
      execute: 0,       // instantly kill non-boss under this HP fraction
      dashDmg: 0,       // dash shockwave damage multiplier
      comboDmg: 0,      // bonus damage per combo point (capped at 50)
      pierceBonus: 0,   // extra bolt pierce
      chainBonus: 0,    // extra volt chain hops
      luck: 0,          // relic drop chance / tier-up bonus
      bossDmg: 1,       // damage multiplier vs bosses
      goldOnKill: 0     // flat gold per kill
    };
    this.stats.hp = this.stats.maxHp;
    this.shieldReady = 0;      // current shield charges
    this.shieldRechargeIn = 0;
  }

  createWorld() {
    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.setBackgroundColor(SS.COLORS.bg);

    // Soft grid backdrop, drawn once into a single Graphics (cheap)
    const g = this.add.graphics().setDepth(-10);
    g.lineStyle(1, SS.COLORS.grid, 1);
    for (let i = 0; i <= WORLD; i += 80) {
      g.lineBetween(i, 0, i, WORLD);
      g.lineBetween(0, i, WORLD, i);
    }
    g.lineStyle(3, 0x2c3f66, 1);
    g.strokeRect(0, 0, WORLD, WORLD);
    // a few decorative glows scattered around
    for (let i = 0; i < 12; i++) {
      this.add.image(Phaser.Math.Between(200, WORLD - 200), Phaser.Math.Between(200, WORLD - 200), 'glow')
        .setDepth(-9).setScale(Phaser.Math.FloatBetween(2, 5))
        .setTint(Phaser.Math.RND.pick([0x123456, 0x1a2a50, 0x28173e])).setAlpha(0.5);
    }
  }

  createPlayer() {
    this.player = this.physics.add.image(WORLD / 2, WORLD / 2, 'hero').setDepth(10);
    this.player.body.setCircle(18, 8, 8);
    this.player.setCollideWorldBounds(true);
    this.playerShadow = this.add.image(0, 0, 'shadow').setDepth(9);
    // pulsing energy glow under the hero
    this.playerGlow = this.add.image(0, 0, 'hero_core').setDepth(9.5).setScale(1.6);
    this.tweens.add({ targets: this.playerGlow, scale: 2.1, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, ease: 'sine.inout' });
    // shield bubble (visible while a charge is ready)
    this.shieldFx = this.add.image(0, 0, 'shieldfx').setDepth(10.5).setVisible(false);
    this.tweens.add({ targets: this.shieldFx, scale: 1.08, alpha: 0.7, duration: 800, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.invulnUntil = 0;
    this.dashReadyAt = 0;
    this.hurtCooldown = 0;
    // subtle idle breathing
    this.tweens.add({ targets: this.player, scaleX: 1.05, scaleY: 0.95, duration: 600, yoyo: true, repeat: -1, ease: 'sine.inout' });
  }

  createGroups() {
    this.enemies = this.physics.add.group({ maxSize: 300 });
    this.projectiles = this.physics.add.group({ defaultKey: 'proj', maxSize: 200 });
    this.enemyProj = this.physics.add.group({ defaultKey: 'eproj', maxSize: 80 });
    this.pickups = this.physics.add.group({ maxSize: 400 });

    // player projectiles vs enemies
    this.physics.add.overlap(this.projectiles, this.enemies, (p, e) => {
      if (!p.active || !e.active) return;
      this.damageEnemy(e, p.dmg, p.crit);
      p.pierce--;
      if (p.pierce <= 0) this.killProj(p);
    });
    // enemy projectiles vs player
    this.physics.add.overlap(this.player, this.enemyProj, (pl, p) => {
      if (!p.active) return;
      this.killProj(p);
      this.damagePlayer(p.dmg);
    });
  }

  // Pools for FX: floating texts and particle images (no Phaser emitters — full control)
  createPools() {
    this.textPool = [];
    for (let i = 0; i < 40; i++) {
      const t = this.add.text(0, 0, '', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#fff' })
        .setOrigin(0.5).setDepth(50).setVisible(false).setShadow(0, 2, '#000000aa', 2);
      this.textPool.push(t);
    }
    this.partPool = [];
    for (let i = 0; i < 120; i++) {
      const p = this.add.image(0, 0, 'dot').setDepth(40).setVisible(false);
      this.partPool.push(p);
    }
    this.fx = this.add.graphics().setDepth(45); // lightning lines etc., cleared each frame
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,ESC,P');
    this.keys.ESC.on('down', () => this.ui.togglePause());
    this.keys.P.on('down', () => this.ui.togglePause());
    this.keys.SPACE.on('down', () => this.doDash());
    this.keys.SHIFT.on('down', () => this.doDash());

    // ---- floating virtual joystick (mobile) --------------------------------
    this.joy = { active: false, base: null, thumb: null, vx: 0, vy: 0, lastTap: 0 };
    this.joy.base = this.add.image(0, 0, 'joy_base').setScrollFactor(0).setDepth(90).setVisible(false);
    this.joy.thumb = this.add.image(0, 0, 'joy_thumb').setScrollFactor(0).setDepth(91).setVisible(false);

    this.input.on('pointerdown', (ptr) => {
      SS.Audio.unlock();
      if (this.physics.world.isPaused) return;
      // double-tap = dash
      const now = this.time.now;
      if (now - this.joy.lastTap < 280) this.doDash();
      this.joy.lastTap = now;
      this.joy.active = true;
      this.joy.base.setPosition(ptr.x, ptr.y).setVisible(true);
      this.joy.thumb.setPosition(ptr.x, ptr.y).setVisible(true);
    });
    this.input.on('pointermove', (ptr) => {
      if (!this.joy.active || !ptr.isDown) return;
      const dx = ptr.x - this.joy.base.x, dy = ptr.y - this.joy.base.y;
      const d = Math.hypot(dx, dy), max = 48;
      const cl = Math.min(d, max);
      this.joy.vx = d > 8 ? (dx / d) * (cl / max) : 0;
      this.joy.vy = d > 8 ? (dy / d) * (cl / max) : 0;
      this.joy.thumb.setPosition(this.joy.base.x + (d ? dx / d * cl : 0), this.joy.base.y + (d ? dy / d * cl : 0));
    });
    this.input.on('pointerup', () => {
      this.joy.active = false; this.joy.vx = 0; this.joy.vy = 0;
      this.joy.base.setVisible(false); this.joy.thumb.setVisible(false);
    });
  }

  createPet() {
    this.pet = null;
    const id = SS.Save.data.pets.active;
    if (!id) return;
    const def = SS.PETS.find(p => p.id === id);
    this.pet = this.add.image(this.player.x - 40, this.player.y - 40, 'pet').setTint(def.color).setDepth(9);
    this.pet.petId = id;
    this.pet.timer = 0;
    this.tweens.add({ targets: this.pet, y: '+=6', duration: 500, yoyo: true, repeat: -1, ease: 'sine.inout' });
  }

  // ==========================================================================
  // UPDATE LOOP
  // ==========================================================================
  update(time, delta) {
    if (this.gameOver) return;
    const dt = (delta / 1000) * this.slowFactor;
    if (this.physics.world.isPaused) return;

    this.fx.clear();
    this.movePlayer(dt);
    this.updateRelics(time, dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updatePet(dt);

    // combo decay
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) { this.combo = 0; this.ui.setCombo(0); }
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.shieldFx.setPosition(this.player.x, this.player.y).setVisible(this.shieldReady > 0);
    // slight tilt into the movement direction — makes motion feel alive
    const vx = this.player.body.velocity.x;
    this.player.setRotation(Phaser.Math.Linear(this.player.rotation, vx * 0.0004, 0.15));
  }

  movePlayer(dt) {
    let vx = 0, vy = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;
    if (this.joy.active) { vx = this.joy.vx; vy = this.joy.vy; }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const sp = this.stats.moveSpeed * this.slowFactor;
    this.player.setVelocity(vx * sp, vy * sp);
    if (vx !== 0) this.player.setFlipX(vx < 0);
    this.lastMove = (vx || vy) ? { x: vx, y: vy } : (this.lastMove || { x: 1, y: 0 });
  }

  doDash() {
    if (this.time.now < this.dashReadyAt || this.gameOver || this.physics.world.isPaused) return;
    this.dashReadyAt = this.time.now + this.stats.dashCd;
    this.invulnUntil = this.time.now + 300;
    const d = this.lastMove || { x: 1, y: 0 };
    this.player.setVelocity(d.x * 900, d.y * 900);
    // brief burst then normal control resumes naturally next frame's movePlayer
    this.tweens.add({ targets: this.player, alpha: 0.4, duration: 90, yoyo: true, repeat: 1 });
    SS.Audio.play('dash');
    this.burst(this.player.x, this.player.y, 0x4de1ff, 10, 3);
    // Comet Dash: dashing detonates a shockwave
    if (this.stats.dashDmg > 0) {
      const dmg = 30 * this.stats.dmgMult * this.stats.dashDmg;
      this.explode(this.player.x, this.player.y, 130 * this.stats.area, dmg, null);
    }
    // ghost trail
    for (let i = 0; i < 3; i++) {
      const gh = this.add.image(this.player.x - d.x * i * 20, this.player.y - d.y * i * 20, 'hero')
        .setAlpha(0.3 - i * 0.08).setDepth(8).setTint(0x4de1ff);
      this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() });
    }
    this.ui.setDashCd(this.stats.dashCd);
  }

  everySecond() {
    if (this.gameOver || this.physics.world.isPaused) return;
    this.runTime++;
    this.ui.setTimer(this.runTime);
    SS.Save.missionProgress('mtime', 1);

    // regen
    if (this.stats.regen > 0 && this.stats.hp < this.stats.maxHp) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.regen);
      this.ui.setHp(this.stats.hp, this.stats.maxHp);
    }
    // shield recharge (Aegis Core upgrade)
    if (this.stats.shieldMax > 0 && this.shieldReady < this.stats.shieldMax) {
      if (--this.shieldRechargeIn <= 0) {
        this.shieldReady++;
        this.shieldRechargeIn = 10;
        SS.Audio.play('shield');
      }
    }
    // difficulty ramp: spawn faster over time
    this.spawnEvent.delay = SS.DIFF.spawnDelay(this.runTime);
    // boss clock
    if (this.runTime >= this.nextBossAt && !this.boss) this.spawnBoss();
  }

  // ==========================================================================
  // RELIC RING — the merge board that orbits the player
  // ==========================================================================
  addRelic(type, tier = 0, silent = false) {
    // Merge rule: if a relic of same type+tier exists → merge into tier+1 (chain)
    const match = this.relics.find(r => r.type === type && r.tier === tier);
    if (match && tier < SS.TIERS.length - 1) {
      this.removeRelic(match);
      this.merges++;
      SS.Save.data.stats.totalMerges++;
      SS.Save.missionProgress('mmerge', 1);
      const newTier = tier + 1;
      if (newTier === SS.TIERS.length - 1) {
        SS.Save.data.stats.legendForged++;
        SS.Audio.play('legend');
        this.ui.toast('LEGENDARY FORGED!', 0xffd34d);
        this.flash(0xffd34d, 300);
      } else {
        SS.Audio.play('merge');
      }
      this.burst(this.player.x, this.player.y, SS.TIERS[newTier].color, 16, 4);
      this.floatText(this.player.x, this.player.y - 50, 'MERGE! ' + SS.TIERS[newTier].name, SS.TIERS[newTier].color, 18);
      this.addRelic(type, newTier, true); // may chain-merge again
      this.checkAch();
      return;
    }
    // Ring full and no merge possible → auto-convert to gold (never feels wasted)
    if (this.relics.length >= this.maxSlots) {
      const goldVal = 10 * (tier + 1);
      this.addGold(goldVal, this.player.x, this.player.y - 40);
      return;
    }
    // Forge a new relic into the ring
    const def = SS.RELICS[type];
    const spr = this.add.image(this.player.x, this.player.y, 'relic')
      .setTint(def.color).setDepth(11).setScale(0.9 + tier * 0.18);
    const glow = this.add.image(this.player.x, this.player.y, 'glow')
      .setTint(SS.TIERS[tier].color).setDepth(10.5).setScale(0.5 + tier * 0.22).setAlpha(0.8);
    spr.setScale(0); // pop-in
    this.tweens.add({ targets: spr, scale: 0.9 + tier * 0.18, duration: 250, ease: 'back.out' });
    this.relics.push({ type, tier, spr, glow, cd: 0, def });
    if (!silent) SS.Audio.play('frag');
    this.ui.setRelics(this.relics, this.maxSlots);
  }

  removeRelic(r) {
    r.spr.destroy(); r.glow.destroy();
    this.relics.splice(this.relics.indexOf(r), 1);
    this.ui.setRelics(this.relics, this.maxSlots);
  }

  updateRelics(time, dt) {
    this.orbitAngle += dt * 1.6 * this.stats.orbitSpeed;
    const R = ORBIT_BASE_R * this.stats.orbitRadius;
    const n = this.relics.length;
    for (let i = 0; i < n; i++) {
      const r = this.relics[i];
      const a = this.orbitAngle + (i / n) * Math.PI * 2;
      r.spr.setPosition(this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R);
      r.glow.setPosition(r.spr.x, r.spr.y);
      r.spr.rotation += dt * 2;

      // per-relic attack cooldown, scaled by tier & attack-speed stat
      r.cd -= dt * 1000 * this.stats.atkSpeed;
      if (r.cd <= 0) {
        this.relicAttack(r);
        r.cd = r.def.cd * SS.TIER_RATE(r.tier);
      }
      // Blade relics also do constant contact damage
      if (r.type === 'blade') this.bladeContact(r, time);
    }
  }

  relicDmg(r) {
    const comboBonus = 1 + Math.min(this.combo, 50) * this.stats.comboDmg;
    return r.def.dmg * SS.TIER_DMG(r.tier) * this.stats.dmgMult * comboBonus;
  }

  // Dispatch each relic type's auto-attack
  relicAttack(r) {
    const dmg = this.relicDmg(r);
    switch (r.type) {
      case 'bolt': {
        const t = this.nearestEnemy(r.spr.x, r.spr.y, 520);
        if (!t) { r.cd = 100; return; }
        const shots = this.stats.projCount + Math.floor(r.tier / 2);
        for (let i = 0; i < shots; i++) {
          const spread = (i - (shots - 1) / 2) * 0.18;
          this.fireProjectile(r.spr.x, r.spr.y, t, dmg, r.def.color, spread,
            2 + Math.floor(r.tier / 2) + this.stats.pierceBonus); // pierces by default
        }
        SS.Audio.play('shoot');
        break;
      }
      case 'blade': break; // blade is pure contact damage (handled per-frame)
      case 'frost': {
        // expanding ring that damages + slows everything nearby
        const radius = (150 + r.tier * 45) * this.stats.area;
        const ring = this.add.image(this.player.x, this.player.y, 'ring').setTint(r.def.color).setDepth(12).setScale(0.3);
        this.tweens.add({ targets: ring, scale: radius / 30, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        this.eachEnemyIn(this.player.x, this.player.y, radius, e => {
          this.damageEnemy(e, dmg, Math.random() < this.stats.critChance);
          e.slowUntil = this.time.now + 1800 + r.tier * 400;
        });
        break;
      }
      case 'ember': {
        const t = this.nearestEnemy(this.player.x, this.player.y, 480);
        if (!t) { r.cd = 150; return; }
        const bomb = this.add.image(r.spr.x, r.spr.y, 'bomb').setTint(r.def.color).setDepth(20);
        const tx = t.x + Phaser.Math.Between(-30, 30), ty = t.y + Phaser.Math.Between(-30, 30);
        this.tweens.add({
          targets: bomb, x: tx, y: ty, duration: 420, ease: 'quad.in',
          onUpdate: (tw) => bomb.setScale(1 + Math.sin(tw.progress * Math.PI) * 0.8),
          onComplete: () => { bomb.destroy(); this.explode(tx, ty, (90 + r.tier * 25) * this.stats.area, dmg, r); }
        });
        break;
      }
      case 'volt': {
        // chain lightning: hop between nearby enemies
        let from = { x: r.spr.x, y: r.spr.y };
        let t = this.nearestEnemy(from.x, from.y, 420);
        const hit = new Set();
        const hops = 2 + r.tier + this.stats.chainBonus;
        for (let i = 0; i < hops && t; i++) {
          this.zap(from.x, from.y, t.x, t.y);
          this.damageEnemy(t, dmg, Math.random() < this.stats.critChance);
          hit.add(t);
          from = t;
          t = this.nearestEnemy(from.x, from.y, 260, hit);
        }
        break;
      }
      case 'void': {
        const t = this.nearestEnemy(this.player.x, this.player.y, 520);
        if (!t) { r.cd = 200; return; }
        this.spawnVortex(t.x, t.y, dmg, r.tier);
        break;
      }
    }
  }

  bladeContact(r, time) {
    const dmg = this.relicDmg(r) * 0.35; // fast ticks, small chunks
    this.eachEnemyIn(r.spr.x, r.spr.y, (26 + r.tier * 6) * this.stats.area, e => {
      if ((e.bladeCd || 0) > time) return;
      e.bladeCd = time + 220;
      this.damageEnemy(e, dmg, Math.random() < this.stats.critChance);
    });
  }

  zap(x1, y1, x2, y2) {
    // jagged lightning segment drawn into the per-frame fx graphics
    this.fx.lineStyle(3, 0xffe94d, 0.9);
    const segs = 5;
    let px = x1, py = y1;
    for (let i = 1; i <= segs; i++) {
      const nx = x1 + (x2 - x1) * (i / segs) + (i < segs ? Phaser.Math.Between(-14, 14) : 0);
      const ny = y1 + (y2 - y1) * (i / segs) + (i < segs ? Phaser.Math.Between(-14, 14) : 0);
      this.fx.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
  }

  spawnVortex(x, y, dmg, tier) {
    const v = this.add.image(x, y, 'glow').setTint(0xb45dff).setDepth(6).setScale(2 + tier * 0.5);
    this.tweens.add({ targets: v, angle: 360, duration: 2500, repeat: 0 });
    const pullR = (180 + tier * 40) * this.stats.area;
    const tick = this.time.addEvent({
      delay: 150, repeat: 16,
      callback: () => {
        this.eachEnemyIn(x, y, pullR, e => {
          if (e.isBoss) return; // bosses resist the pull
          const a = Math.atan2(y - e.y, x - e.x);
          e.x += Math.cos(a) * 5; e.y += Math.sin(a) * 5;
          if (Phaser.Math.Distance.Between(e.x, e.y, x, y) < 60) this.damageEnemy(e, dmg * 0.3, false);
        });
      }
    });
    this.tweens.add({ targets: v, alpha: 0, scale: 0.2, delay: 2200, duration: 400, onComplete: () => { v.destroy(); tick.remove(); } });
  }

  explode(x, y, radius, dmg, r) {
    SS.Audio.play('explode');
    this.shake(4, 120);
    const ring = this.add.image(x, y, 'ring').setTint(0xff5347).setDepth(12).setScale(0.3);
    this.tweens.add({ targets: ring, scale: radius / 28, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.burst(x, y, 0xff9c3f, 14, 5);
    this.eachEnemyIn(x, y, radius, e => {
      this.damageEnemy(e, dmg, Math.random() < this.stats.critChance);
      if (r) e.burn = { until: this.time.now + 2000, dps: dmg * 0.15, last: 0 };
    });
  }

  // ==========================================================================
  // PROJECTILES
  // ==========================================================================
  fireProjectile(x, y, target, dmg, color, spreadAngle = 0, pierce = 1) {
    const p = this.projectiles.get(x, y);
    if (!p) return;
    p.setActive(true).setVisible(true).setTexture('proj').setTint(color).setDepth(15).setScale(1);
    p.body.enable = true;
    const a = Math.atan2(target.y - y, target.x - x) + spreadAngle;
    const crit = Math.random() < this.stats.critChance;
    p.dmg = dmg * (crit ? this.stats.critDmg : 1);
    p.crit = crit;
    p.pierce = pierce;
    p.setVelocity(Math.cos(a) * 720, Math.sin(a) * 720);
    p.lifeEnd = this.time.now + 1200;
  }

  spawnEnemyProj(x, y, tx, ty, dmg, speed = 240) {
    const p = this.enemyProj.get(x, y);
    if (!p) return;
    p.setActive(true).setVisible(true).setTint(0xff6bd6).setDepth(15).setScale(1.2);
    p.body.enable = true;
    const a = Math.atan2(ty - y, tx - x);
    p.dmg = dmg;
    p.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    p.lifeEnd = this.time.now + 4000;
    this.tweens.add({ targets: p, angle: 360, duration: 600, repeat: 6 });
  }

  killProj(p) {
    p.setActive(false).setVisible(false);
    p.body.enable = false;
  }

  // ==========================================================================
  // ENEMIES
  // ==========================================================================
  spawnEnemy(forceType = null) {
    if (this.gameOver || this.physics.world.isPaused) return;
    // later in the run enemies arrive in packs — relentless pressure
    const pack = forceType ? 1 : Math.min(SS.DIFF.packSize(this.runTime), 4);
    for (let i = 0; i < pack; i++) this.spawnOneEnemy(forceType);
  }

  spawnOneEnemy(forceType = null) {
    const type = forceType || SS.pickEnemy(this.runTime);
    const def = SS.ENEMIES[type];
    // spawn just outside the camera view, inside world bounds
    const cam = this.cameras.main;
    const a = Math.random() * Math.PI * 2;
    const d = Math.hypot(cam.width, cam.height) / 2 + 60;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * d, 30, WORLD - 30);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * d, 30, WORLD - 30);

    const e = this.enemies.get(x, y, 'e_' + def.shape);
    if (!e) return;
    const hpScale = SS.DIFF.hpScale(this.runTime);
    e.setActive(true).setVisible(true).setTexture('e_' + def.shape).setTint(def.color).setDepth(5);
    e.body.enable = true;
    e.body.setCircle(def.size, (e.width - def.size * 2) / 2, (e.height - def.size * 2) / 2);
    e.type = type; e.def = def; e.tintBase = def.color;
    e.hp = def.hp * hpScale;
    e.maxHp = e.hp;
    e.dmg = def.dmg * SS.DIFF.dmgScale(this.runTime);
    e.speed = def.speed * SS.DIFF.speedScale(this.runTime) * Phaser.Math.FloatBetween(0.9, 1.1);
    e.isBoss = false; e.dying = false;
    e.slowUntil = 0; e.burn = null; e.bladeCd = 0; e.shootCd = this.time.now + 1500;
    e.setScale(0).setAlpha(1).setAngle(0);
    this.tweens.add({ targets: e, scale: 1, duration: 200, ease: 'back.out' });
    // idle wobble — enemies feel organic, not static shapes
    this.tweens.add({
      targets: e, angle: { from: -6, to: 6 },
      duration: Phaser.Math.Between(350, 550), yoyo: true, repeat: -1, ease: 'sine.inout'
    });
  }

  spawnBoss() {
    this.bossCount++;
    this.nextBossAt = this.runTime + 65;   // relentless Titan cadence
    const def = SS.BOSSES[(this.bossCount - 1) % SS.BOSSES.length];
    SS.Audio.play('boss');
    this.ui.bossBanner(def.name, def.color);
    this.shake(6, 500);
    this.flash(0xff0000, 200);

    const a = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * 500, 100, WORLD - 100);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * 500, 100, WORLD - 100);
    const e = this.enemies.get(x, y, def.tex);
    if (!e) return;
    e.setActive(true).setVisible(true).setTexture(def.tex).setTint(def.color).setDepth(6);
    e.body.enable = true;
    e.body.setCircle(46, 14, 14);
    e.type = 'boss'; e.def = { gold: 50, xp: 40, size: 46 }; e.dying = false;
    e.bossDef = def; e.tintBase = def.color;
    e.hp = SS.DIFF.bossHp(this.bossCount) * def.hpMult;
    e.maxHp = e.hp;
    e.dmg = 25 * SS.DIFF.dmgScale(this.runTime);
    e.speed = def.speed;
    e.isBoss = true;
    e.slowUntil = 0; e.burn = null; e.bladeCd = 0;
    e.attackAt = this.time.now + 3000;
    e.chargeAt = this.time.now + 6000;
    e.specialAt = this.time.now + 5000;
    e.spiralA = 0;
    this.boss = e;
    e.setScale(0);
    this.tweens.add({ targets: e, scale: 1, duration: 500, ease: 'back.out' });
    this.tweens.add({ targets: e, angle: 360, duration: 8000, repeat: -1 });
    this.ui.showBossBar(e.maxHp, def.name, def.color);
  }

  // Per-pattern boss brains — returns true if normal steering should be skipped
  bossAI(e, now) {
    const p = e.bossDef.pattern;
    switch (p) {
      case 'ring':       // radial bullet storms + telegraphed charge
        if (e.attackAt < now) {
          e.attackAt = now + 3200;
          for (let i = 0; i < 14; i++) {
            const ba = (i / 14) * Math.PI * 2;
            this.spawnEnemyProj(e.x, e.y, e.x + Math.cos(ba) * 100, e.y + Math.sin(ba) * 100, e.dmg * 0.5, 190);
          }
        }
        if (e.chargeAt < now) { e.chargeAt = now + 7500; this.bossCharge(e, 420); return true; }
        break;

      case 'spiral':     // continuous rotating double-arm barrage
        if (e.attackAt < now) {
          e.attackAt = now + 240;
          e.spiralA += 0.5;
          for (const off of [0, Math.PI]) {
            const ba = e.spiralA + off;
            this.spawnEnemyProj(e.x, e.y, e.x + Math.cos(ba) * 100, e.y + Math.sin(ba) * 100, e.dmg * 0.45, 170);
          }
        }
        break;

      case 'teleport':   // vanish, reappear near the player, spit a 5-way fan
        if (e.specialAt < now) {
          e.specialAt = now + 5000;
          this.burst(e.x, e.y, e.bossDef.color, 14, 5);
          const ta = Math.random() * Math.PI * 2;
          e.setPosition(
            Phaser.Math.Clamp(this.player.x + Math.cos(ta) * 280, 100, WORLD - 100),
            Phaser.Math.Clamp(this.player.y + Math.sin(ta) * 280, 100, WORLD - 100));
          e.setAlpha(0);
          this.tweens.add({ targets: e, alpha: 1, duration: 250 });
          this.burst(e.x, e.y, e.bossDef.color, 14, 5);
          const pa = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          for (let i = -2; i <= 2; i++) {
            const ba = pa + i * 0.22;
            this.spawnEnemyProj(e.x, e.y, e.x + Math.cos(ba) * 100, e.y + Math.sin(ba) * 100, e.dmg * 0.5, 230);
          }
        }
        break;

      case 'storm':      // fast hunter: aimed volleys + summons runners
        if (e.attackAt < now) {
          e.attackAt = now + 3000;
          for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 140, () => {
              if (!e.active) return;
              this.spawnEnemyProj(e.x, e.y, this.player.x, this.player.y, e.dmg * 0.4, 320);
            });
          }
        }
        if (e.specialAt < now) {
          e.specialAt = now + 8000;
          for (let i = 0; i < 3; i++) this.spawnOneEnemy('runner');
          this.ui.toast('MINIONS!', 0xffe94d);
        }
        break;

      case 'blades':     // relentless double charges, bullet ring on landing
        if (e.chargeAt < now) {
          e.chargeAt = now + 5000;
          this.bossCharge(e, 480, () => {
            if (!e.active) return;
            for (let i = 0; i < 8; i++) {
              const ba = (i / 8) * Math.PI * 2;
              this.spawnEnemyProj(e.x, e.y, e.x + Math.cos(ba) * 100, e.y + Math.sin(ba) * 100, e.dmg * 0.4, 200);
            }
            this.time.delayedCall(700, () => e.active && this.bossCharge(e, 480));
          });
          return true;
        }
        break;

      case 'summon':     // slow colossus: grunt waves + wide rings
        if (e.specialAt < now) {
          e.specialAt = now + 4500;
          for (let i = 0; i < 4; i++) this.spawnOneEnemy('grunt');
        }
        if (e.attackAt < now) {
          e.attackAt = now + 5500;
          for (let i = 0; i < 10; i++) {
            const ba = (i / 10) * Math.PI * 2;
            this.spawnEnemyProj(e.x, e.y, e.x + Math.cos(ba) * 100, e.y + Math.sin(ba) * 100, e.dmg * 0.55, 160);
          }
        }
        break;
    }
    return false;
  }

  // Telegraph (white flash) then charge at the player
  bossCharge(e, speed, onLand = null) {
    e.setTintFill(0xffffff);
    this.time.delayedCall(500, () => {
      if (!e.active) return;
      e.setTint(e.tintBase);
      const ca = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      e.setVelocity(Math.cos(ca) * speed, Math.sin(ca) * speed);
      this.time.delayedCall(600, () => {
        if (!e.active) return;
        e.setVelocity(0, 0);
        if (onLand) onLand();
      });
    });
  }

  updateEnemies(dt) {
    const now = this.time.now;
    this.enemies.children.iterate(e => {
      if (!e || !e.active || e.dying) return;
      const slow = e.slowUntil > now ? 0.45 : 1;
      const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      let sp = e.speed * slow * this.slowFactor;

      if (e.type === 'spitter') {
        // ranged: hold ~260px distance and shoot
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (d < 220) sp = -sp; else if (d < 300) sp = 0;
        if (e.shootCd < now && d < 480) {
          e.shootCd = now + 2400;
          this.spawnEnemyProj(e.x, e.y, this.player.x, this.player.y, e.dmg);
        }
      }
      if (e.isBoss) {
        if (this.bossAI(e, now)) return; // skip normal steering while charging
      }
      e.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);

      // burn damage-over-time ticks
      if (e.burn && e.burn.until > now) {
        if (now - e.burn.last > 400) {
          e.burn.last = now;
          this.damageEnemy(e, e.burn.dps * 0.4, false, true);
        }
      }

      // touch damage to player (+ Thornplate reflection)
      const touchD = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (touchD < (e.def.size || 16) + 18 && this.hurtCooldown < now) {
        this.hurtCooldown = now + 650;   // forgiving touch-damage window
        this.damagePlayer(e.dmg);
        if (this.stats.thorns > 0) this.damageEnemy(e, e.dmg * this.stats.thorns, false);
      }
    });

    // expire projectiles
    this.projectiles.children.iterate(p => { if (p && p.active && p.lifeEnd < now) this.killProj(p); });
    this.enemyProj.children.iterate(p => { if (p && p.active && p.lifeEnd < now) this.killProj(p); });

    if (this.boss && this.boss.active) this.ui.setBossHp(this.boss.hp, this.boss.maxHp);
  }

  damageEnemy(e, dmg, crit = false, quiet = false) {
    if (!e.active || e.dying || this.gameOver) return;
    let final = dmg * (crit ? this.stats.critDmg : 1);
    if (e.isBoss) final *= this.stats.bossDmg;
    e.hp -= final;
    // Reaper's Mark: finish off weakened non-boss enemies instantly
    if (!e.isBoss && this.stats.execute > 0 && e.hp > 0 && e.hp < e.maxHp * this.stats.execute) {
      e.hp = 0;
      if (!quiet) this.floatText(e.x, e.y - 34, 'EXECUTED', 0xb45dff, 14);
    }

    if (!quiet) {
      this.floatText(e.x + Phaser.Math.Between(-10, 10), e.y - 20, Math.floor(final),
        crit ? 0xffe94d : 0xffffff, crit ? 22 : 15);
      if (crit) { SS.Audio.play('crit'); this.hitStop(40); }
      else SS.Audio.play('hit');

      // === HIT FEEL ===
      // 1) white impact flash
      e.setTintFill(0xffffff);
      this.time.delayedCall(45, () => { if (e.active) e.setTint(e.tintBase || e.def.color); });
      // 2) knockback away from the hero (bosses stand firm)
      if (!e.isBoss && e.body) {
        const ka = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        e.body.velocity.x += Math.cos(ka) * (crit ? 260 : 130);
        e.body.velocity.y += Math.sin(ka) * (crit ? 260 : 130);
      }
      // 3) directional sparks flying off the impact point
      this.sparks(e.x, e.y, Math.atan2(e.y - this.player.y, e.x - this.player.x), crit ? 6 : 3);
      // 4) squash feedback
      this.tweens.add({ targets: e, scaleX: 1.25, scaleY: 0.75, duration: 60, yoyo: true });
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    if (!e.active || e.dying) return;
    e.dying = true;                 // corpse pops for ~180ms before pooling
    this.tweens.killTweensOf(e);    // stop wobble/squash tweens first
    e.body.enable = false;
    e.setVelocity(0, 0);

    // Vampiric upgrade: every kill feeds you
    if (this.stats.lifesteal > 0 && this.stats.hp < this.stats.maxHp) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.lifesteal);
      this.ui.setHp(this.stats.hp, this.stats.maxHp);
    }

    this.kills++;
    SS.Save.data.stats.totalKills++;
    SS.Save.missionProgress('mkill', 1);
    if (this.stats.goldOnKill > 0) this.addGold(this.stats.goldOnKill);

    // combo — generous 3s window so mowing chains keep climbing
    this.combo++;
    this.comboTimer = 3000;
    this.ui.setCombo(this.combo);

    // === SATISFYING DEATH ===
    // rising musical pop (pitch follows the combo — crowds become melodies)
    SS.Audio.killPop(this.combo);
    // corpse inflates, spins and evaporates
    e.setTintFill(0xffffff);
    this.tweens.add({
      targets: e, scaleX: 1.6, scaleY: 1.6, alpha: 0,
      angle: e.angle + Phaser.Math.Between(-50, 50),
      duration: 180, ease: 'quad.out',
      onComplete: () => { e.setActive(false).setVisible(false); e.dying = false; }
    });
    this.burst(e.x, e.y, e.isBoss ? 0xffd34d : (e.def.color || 0xffffff), e.isBoss ? 30 : 10, e.isBoss ? 6 : 4);
    // every 10th combo: shockwave ring for extra drama
    if (this.combo % 10 === 0 && !e.isBoss) {
      const ring = this.add.image(e.x, e.y, 'ring').setTint(0xffe94d).setDepth(12).setScale(0.4);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    }

    if (e.isBoss) this.killBoss(e);
    else this.dropLoot(e);
    this.ui.setKills(this.kills);
  }

  killBoss(e) {
    this.boss = null;
    this.bossKillsThisRun = (this.bossKillsThisRun || 0) + 1;
    SS.Save.data.stats.bossKills++;
    SS.Save.missionProgress('mboss', 1);
    this.ui.hideBossBar();

    // ---- THE moment: hit-stop → slow-motion → flash → reward shower --------
    SS.Audio.play('bosskill');
    this.hitStop(120);
    this.slowMo(0.25, 1200);
    this.flash(0xffffff, 250);
    this.shake(10, 600);
    this.ui.toast((e.bossDef ? e.bossDef.name : 'TITAN') + ' SLAIN!', 0xffd34d);

    // reward shower: gold pile + gem + guaranteed Epic fragment
    const goldDrops = 14 * (e.bossDef && e.bossDef.goldMult || 1);
    for (let i = 0; i < goldDrops; i++) this.dropPickup(e.x + Phaser.Math.Between(-70, 70), e.y + Phaser.Math.Between(-70, 70), 'gold', 5);
    this.dropPickup(e.x, e.y - 30, 'gem', 1);
    this.dropPickup(e.x, e.y + 30, 'frag', { type: SS.randomRelicType(), tier: 3 }); // Epic!
    this.dropPickup(e.x - 40, e.y, 'heart', 30);
    for (let i = 0; i < 6; i++) this.dropPickup(e.x + Phaser.Math.Between(-60, 60), e.y + Phaser.Math.Between(-60, 60), 'xp', 10);

    this.checkAch();
  }

  dropLoot(e) {
    const def = e.def;
    // gold — generous, the meta shop must feel reachable
    if (Math.random() < 0.65) this.dropPickup(e.x, e.y, 'gold', def.gold);
    // xp — nearly every kill feeds the bar (fast progression)
    if (Math.random() < 0.95) this.dropPickup(e.x + 8, e.y + 8, 'xp', def.xp);
    // weapon fragment — THE variable reward. Tier can roll upward (rarity!)
    if (Math.random() < 0.16 * (1 + this.stats.luck)) {
      let tier = 0;
      while (tier < 2 && Math.random() < 0.3 + this.stats.luck * 0.1) tier++; // decent shot at Uncommon/Rare
      this.dropPickup(e.x, e.y - 10, 'frag', { type: SS.randomRelicType(), tier });
    }
    // utility drops
    if (Math.random() < 0.015) this.dropPickup(e.x, e.y, 'magnet', 1);
    if (Math.random() < 0.025) this.dropPickup(e.x, e.y, 'heart', 20);
  }

  // ==========================================================================
  // PICKUPS
  // ==========================================================================
  dropPickup(x, y, kind, value) {
    const p = this.pickups.get(x, y, kind);
    if (!p) return;
    p.setActive(true).setVisible(true).setTexture(kind).setDepth(3).setAlpha(1);
    p.body.enable = true;
    p.kind = kind; p.value = value;
    p.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-60, 60));
    p.body.setDrag(180);
    if (kind === 'frag') {
      p.setTint(SS.RELICS[value.type].color);
      p.setScale(1 + value.tier * 0.25);
      // fragments shimmer to draw the eye
      this.tweens.add({ targets: p, alpha: 0.5, duration: 300, yoyo: true, repeat: -1 });
    } else {
      p.clearTint(); p.setScale(1);
    }
    p.despawnAt = this.time.now + 25000;
  }

  updatePickups(dt) {
    const now = this.time.now;
    const px = this.player.x, py = this.player.y;
    this.pickups.children.iterate(p => {
      if (!p || !p.active) return;
      if (p.despawnAt < now) { p.setActive(false).setVisible(false); p.body.enable = false; return; }
      const d = Phaser.Math.Distance.Between(p.x, p.y, px, py);
      // magnet attraction
      if (d < this.stats.magnet || p.magnetized) {
        const a = Math.atan2(py - p.y, px - p.x);
        const sp = p.magnetized ? 800 : 560;   // loot snaps in fast — feels great
        p.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      }
      // collect
      if (d < 26) this.collect(p);
    });
  }

  collect(p) {
    p.setActive(false).setVisible(false);
    p.body.enable = false;
    p.magnetized = false;
    switch (p.kind) {
      case 'gold': this.addGold(p.value, p.x, p.y); SS.Audio.play('coin'); break;
      case 'xp': this.gainXP(p.value); SS.Audio.play('xp'); break;
      case 'gem':
        this.gems += p.value;
        SS.Save.data.gems += p.value; SS.Save.save();
        this.floatText(p.x, p.y - 20, '+' + p.value + ' GEM', 0x5dffc8, 18);
        SS.Audio.play('buy');
        break;
      case 'frag':
        this.addRelic(p.value.type, p.value.tier);
        this.floatText(p.x, p.y - 24, SS.RELICS[p.value.type].name, SS.TIERS[p.value.tier].color, 14);
        break;
      case 'heart':
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + p.value);
        this.ui.setHp(this.stats.hp, this.stats.maxHp);
        this.floatText(p.x, p.y - 20, '+' + p.value + ' HP', 0xff5a5a, 16);
        break;
      case 'magnet':
        SS.Audio.play('magnet');
        this.flash(0x4de1ff, 120);
        this.pickups.children.iterate(o => { if (o && o.active) o.magnetized = true; });
        this.floatText(p.x, p.y - 20, 'MAGNET!', 0x4de1ff, 18);
        break;
    }
  }

  addGold(v, x, y) {
    const comboMult = 1 + Math.min(this.combo, 40) * 0.05; // combo pays out in gold
    const total = Math.ceil(v * this.stats.goldMult * comboMult);
    this.gold += total;
    SS.Save.missionProgress('mgold', total);
    this.ui.setGold(this.gold);
    if (x !== undefined) this.floatText(x, y - 16, '+' + total, 0xffd34d, 13);
  }

  // ==========================================================================
  // XP / LEVEL DRAFT
  // ==========================================================================
  gainXP(v) {
    this.xp += v * this.stats.xpMult;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      // Deliberately steep: level-ups are rare EVENTS, not constant interruptions
      this.xpNeed = Math.floor(15 + this.level * 10 + Math.pow(this.level, 1.75));
      this.levelUp();
    }
    this.ui.setXp(this.xp, this.xpNeed, this.level);
  }

  levelUp() {
    SS.Audio.play('levelup');
    this.flash(0x53e05a, 150);
    this.burst(this.player.x, this.player.y, 0x53e05a, 20, 5);
    SS.Save.missionSet('mlvl', this.level);
    if (this.level > SS.Save.data.stats.bestLevel) {
      SS.Save.data.stats.bestLevel = this.level;
      SS.Save.checkPets();
    }
    this.checkAch();
    // pause the world and let the UI scene draft 3 upgrades
    this.physics.world.isPaused = true;
    this.time.paused = true;
    this.ui.showLevelUp(SS.rollUpgrades(3), (upg) => {
      upg.apply(this.stats, this);
      this.ui.setHp(this.stats.hp, this.stats.maxHp);
      this.physics.world.isPaused = false;
      this.time.paused = false;
    });
  }

  // Legendary "Cataclysm" card — wipe the screen, keep the loot
  cataclysm() {
    this.flash(0xffffff, 400);
    this.shake(12, 600);
    SS.Audio.play('explode');
    SS.Audio.play('bosskill');
    this.slowMo(0.3, 800);
    this.eachEnemyIn(this.player.x, this.player.y, 2000, e => {
      this.burst(e.x, e.y, 0xff9c3f, 6, 4);
      this.damageEnemy(e, 1000, false, true);
    });
  }

  // ==========================================================================
  // PLAYER DAMAGE / DEATH / REVIVE
  // ==========================================================================
  damagePlayer(dmg) {
    if (this.time.now < this.invulnUntil || this.gameOver) return;
    this.invulnUntil = this.time.now + 400;

    // Phantom Step: chance to slip the hit entirely
    if (this.stats.dodge > 0 && Math.random() < this.stats.dodge) {
      this.floatText(this.player.x, this.player.y - 40, 'DODGE', 0x4de1ff, 16);
      return;
    }
    // Bulwark: flat damage reduction
    dmg *= 1 - Math.min(0.7, this.stats.armor);

    // Aegis Core: a ready shield charge eats the hit entirely
    if (this.shieldReady > 0) {
      this.shieldReady--;
      this.shieldRechargeIn = 10;
      SS.Audio.play('shield');
      this.floatText(this.player.x, this.player.y - 40, 'BLOCKED', 0x4de1ff, 18);
      const pop = this.add.image(this.player.x, this.player.y, 'shieldfx').setDepth(30);
      this.tweens.add({ targets: pop, scale: 2, alpha: 0, duration: 300, onComplete: () => pop.destroy() });
      return;
    }

    this.stats.hp -= dmg;
    this.ui.setHp(this.stats.hp, this.stats.maxHp);
    SS.Audio.play('hurt');
    // === GETTING-HIT FEEL: shake + red vignette pulse + camera zoom punch ===
    this.shake(7, 220);
    this.ui.hurtFlash();
    const cam = this.cameras.main;
    const easeOut = Phaser.Math.Easing.Sine.Out; // camera effects need a real ease fn
    cam.zoomTo(1.045, 70, easeOut, true, (c, p) => { if (p === 1) cam.zoomTo(1, 220, easeOut, true); });
    this.hitStop(50);
    this.floatText(this.player.x, this.player.y - 40, '-' + Math.floor(dmg), 0xff5a5a, 18);
    this.player.setTintFill(0xff8888);
    this.time.delayedCall(90, () => this.player.clearTint());
    if (this.stats.hp <= 0) this.die();
  }

  die() {
    this.gameOver = true;
    this.physics.world.isPaused = true;
    SS.Audio.play('gameover');
    SS.Audio.stopMusic();
    this.shake(8, 400);
    this.tweens.add({ targets: this.player, scale: 0, angle: 720, duration: 700, ease: 'quad.in' });

    // bank the run into the save
    const S = SS.Save.data;
    S.gold += this.gold;
    S.stats.totalGold += this.gold;
    S.stats.runs++;
    if (this.runTime > S.stats.bestTime) S.stats.bestTime = this.runTime;
    SS.Save.checkPets();
    const fresh = SS.Save.checkAchievements();
    SS.Save.save();

    this.time.delayedCall(900, () => {
      this.scene.launch('GameOver', {
        time: this.runTime, level: this.level, kills: this.kills,
        gold: this.gold, gems: this.gems, canRevive: this.revives > 0 || S.gems >= 1,
        freeRevive: this.revives > 0, ach: fresh
      });
    });
  }

  revive() {
    if (this.revives > 0) this.revives--;
    else { SS.Save.data.gems--; SS.Save.save(); }
    this.gameOver = false;
    this.stats.hp = this.stats.maxHp;
    this.player.setScale(1).setAngle(0);
    this.invulnUntil = this.time.now + 2500;
    this.physics.world.isPaused = false;
    this.ui.setHp(this.stats.hp, this.stats.maxHp);
    SS.Audio.play('legend');
    SS.Audio.startMusic();
    this.flash(0xffd34d, 400);
    this.burst(this.player.x, this.player.y, 0xffd34d, 30, 6);
    // shockwave clears nearby enemies on revive
    this.eachEnemyIn(this.player.x, this.player.y, 400, e => this.damageEnemy(e, 9999, false, true));
  }

  // ==========================================================================
  // PET BEHAVIOR
  // ==========================================================================
  updatePet(dt) {
    if (!this.pet) return;
    // lazy follow
    const tx = this.player.x - 44, ty = this.player.y - 36;
    this.pet.x += (tx - this.pet.x) * 3 * dt;
    this.pet.y += (ty - this.pet.y) * 3 * dt;
    this.pet.timer -= dt * 1000;
    if (this.pet.timer > 0) return;

    switch (this.pet.petId) {
      case 'wisp': { // fly to nearest pickup and grab it
        this.pet.timer = 500;
        let best = null, bd = 400;
        this.pickups.children.iterate(p => {
          if (!p || !p.active || p.magnetized) return;
          const d = Phaser.Math.Distance.Between(p.x, p.y, this.pet.x, this.pet.y);
          if (d < bd) { bd = d; best = p; }
        });
        if (best) best.magnetized = true;
        break;
      }
      case 'bitzy': { // little turret
        this.pet.timer = 1300;
        const t = this.nearestEnemy(this.pet.x, this.pet.y, 420);
        if (t) { this.fireProjectile(this.pet.x, this.pet.y, t, 6 * this.stats.dmgMult, 0xffe94d); SS.Audio.play('shoot'); }
        break;
      }
      case 'hartl': { // heal over time
        this.pet.timer = 3000;
        if (this.stats.hp < this.stats.maxHp) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 1);
          this.ui.setHp(this.stats.hp, this.stats.maxHp);
        }
        break;
      }
      case 'nyx': this.pet.timer = 9999999; break; // passive gold bonus (applied in stats)
    }
  }

  // ==========================================================================
  // HELPERS & JUICE
  // ==========================================================================
  nearestEnemy(x, y, maxD = 1e9, exclude = null) {
    let best = null, bd = maxD;
    this.enemies.children.iterate(e => {
      if (!e || !e.active || e.dying || (exclude && exclude.has(e))) return;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  eachEnemyIn(x, y, r, fn) {
    this.enemies.children.iterate(e => {
      if (!e || !e.active || e.dying) return;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r) fn(e);
    });
  }

  floatText(x, y, msg, color = 0xffffff, size = 15) {
    const t = this.textPool.find(t => !t.visible);
    if (!t) return;
    t.setText(msg).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.5);
    t.setFontSize(size);
    t.setColor('#' + color.toString(16).padStart(6, '0'));
    this.tweens.add({
      targets: t, y: y - 44, alpha: 0, scale: 1, duration: 750, ease: 'quad.out',
      onComplete: () => t.setVisible(false)
    });
  }

  burst(x, y, color, count = 10, speed = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.partPool.find(p => !p.visible);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const sp = (Math.random() * 0.6 + 0.4) * speed * 30;
      p.setPosition(x, y).setVisible(true).setAlpha(1).setTint(color)
        .setScale(Phaser.Math.FloatBetween(0.5, 1.4));
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp,
        alpha: 0, scale: 0.1, duration: Phaser.Math.Between(250, 550),
        onComplete: () => p.setVisible(false)
      });
    }
  }

  // Directional impact sparks — elongated shards flying along the hit angle
  sparks(x, y, angle, count = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.partPool.find(p => !p.visible);
      if (!p) return;
      const a = angle + Phaser.Math.FloatBetween(-0.6, 0.6);
      const d = Phaser.Math.Between(30, 80);
      p.setTexture('spark').setPosition(x, y).setVisible(true).setAlpha(1)
        .setTint(0xfff3b0).setRotation(a).setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scaleX: 0.2, duration: Phaser.Math.Between(120, 260),
        onComplete: () => { p.setVisible(false); p.setTexture('dot'); p.setRotation(0); }
      });
    }
  }

  shake(intensity = 5, dur = 200) {
    if (SS.Save.data.settings.shake) this.cameras.main.shake(dur, intensity / 1000);
  }

  flash(color = 0xffffff, dur = 120) {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    this.cameras.main.flash(dur, r, g, b, true);
  }

  // Freeze physics briefly — the classic "hit stop" impact feel
  hitStop(ms = 50) {
    if (this.physics.world.isPaused || this.gameOver) return;
    this.physics.world.isPaused = true;
    this.time.delayedCall(ms, () => {
      if (!this.gameOver && !this.ui.paused && !this.ui.choosing) this.physics.world.isPaused = false;
    });
  }

  // Cinematic slow-motion (boss kills) — scales physics, tweens & our dt
  slowMo(factor = 0.25, ms = 1000) {
    this.slowFactor = factor;
    this.physics.world.timeScale = 1 / factor;
    this.tweens.timeScale = factor;
    this.time.delayedCall(ms * factor, () => {
      this.slowFactor = 1;
      this.physics.world.timeScale = 1;
      this.tweens.timeScale = 1;
    });
  }

  checkAch() {
    for (const a of SS.Save.checkAchievements()) {
      this.ui.toast(`Achievement: ${a.name}  (+${a.gem} gems)`, 0xffd34d);
      SS.Audio.play('ach');
    }
    for (const p of SS.Save.checkPets()) {
      this.ui.toast(`New pet unlocked: ${p.name}!`, 0xb45dff);
      SS.Audio.play('ach');
    }
  }
}
