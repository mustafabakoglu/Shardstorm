// ============================================================================
// SHARDSTORM — data.js
// All static game data: relics, tiers, upgrades, enemies, meta shop, pets,
// achievements, missions. Pure data + tiny helper functions. No Phaser here.
// ============================================================================

const SS = window.SS = {}; // global game namespace

// ---------------------------------------------------------------------------
// Color palette (flat vector neon on dark navy)
// ---------------------------------------------------------------------------
SS.COLORS = {
  bg: 0x0a0e1a, grid: 0x141b2e, panel: 0x111a2e, panelLight: 0x1b2a47,
  white: 0xffffff, gold: 0xffd34d, xp: 0x53e05a, hp: 0xff5a5a,
  cyan: 0x4de1ff, orange: 0xff9c3f, ice: 0x9fd8ff, red: 0xff5347,
  yellow: 0xffe94d, purple: 0xb45dff, pink: 0xff6bd6, gem: 0x5dffc8
};

// ---------------------------------------------------------------------------
// Relic tiers ( = loot rarity). Damage multiplies per tier.
// ---------------------------------------------------------------------------
SS.TIERS = [
  { name: 'Common',    color: 0x9aa7bd },
  { name: 'Uncommon',  color: 0x53e05a },
  { name: 'Rare',      color: 0x4de1ff },
  { name: 'Epic',      color: 0xb45dff },
  { name: 'Legendary', color: 0xffd34d }
];
SS.TIER_DMG = t => Math.pow(2.2, t);      // tier 0..4 damage multiplier
SS.TIER_RATE = t => 1 / (1 + t * 0.15);   // cooldown multiplier (faster per tier)

// ---------------------------------------------------------------------------
// Relic types — the six auto-attacking orbit weapons
// key, display name, base damage, base cooldown (ms), drop weight, tint
// ---------------------------------------------------------------------------
SS.RELICS = {
  bolt:  { name: 'Bolt Shard',  dmg: 8,  cd: 900,  weight: 30, color: 0x4de1ff, desc: 'Fires at the nearest enemy' },
  blade: { name: 'Blade Shard', dmg: 12, cd: 350,  weight: 25, color: 0xff9c3f, desc: 'Orbiting melee saw' },
  frost: { name: 'Frost Shard', dmg: 5,  cd: 2200, weight: 15, color: 0x9fd8ff, desc: 'Freezing pulse, slows enemies' },
  ember: { name: 'Ember Shard', dmg: 10, cd: 1800, weight: 15, color: 0xff5347, desc: 'Lobs exploding firebombs' },
  volt:  { name: 'Volt Shard',  dmg: 7,  cd: 1400, weight: 10, color: 0xffe94d, desc: 'Chain lightning' },
  void:  { name: 'Void Shard',  dmg: 4,  cd: 3500, weight: 5,  color: 0xb45dff, desc: 'Vortex that pulls enemies in' }
};
SS.RELIC_KEYS = Object.keys(SS.RELICS);

// Weighted random relic type (rarer types drop less)
SS.randomRelicType = function () {
  let total = 0;
  for (const k of SS.RELIC_KEYS) total += SS.RELICS[k].weight;
  let r = Math.random() * total;
  for (const k of SS.RELIC_KEYS) { r -= SS.RELICS[k].weight; if (r <= 0) return k; }
  return 'bolt';
};

// ---------------------------------------------------------------------------
// Enemy archetypes. hp/speed/dmg scale further with elapsed run time.
// ---------------------------------------------------------------------------
SS.ENEMIES = {
  grunt:  { hp: 10,  speed: 52,  dmg: 5,  size: 16, gold: 2, xp: 4, color: 0xff6bd6, shape: 'tri',  weight: 50, minT: 0 },
  runner: { hp: 6,   speed: 100, dmg: 4,  size: 12, gold: 2, xp: 3, color: 0x53e05a, shape: 'dart', weight: 25, minT: 20 },
  brute:  { hp: 45,  speed: 30,  dmg: 12, size: 26, gold: 7, xp: 10, color: 0xff5347, shape: 'hex',  weight: 15, minT: 60 },
  spitter:{ hp: 15,  speed: 38,  dmg: 5,  size: 15, gold: 5, xp: 6, color: 0xb45dff, shape: 'dia',  weight: 10, minT: 100, ranged: true }
};
// Difficulty curves (t = seconds elapsed) — POWER FANTASY tuning:
// enemies stay individually weak but arrive in ever-bigger crowds.
// The player mows; the horde grows. Danger comes from volume, not tankiness.
SS.DIFF = {
  hpScale:    t => 1 + Math.pow(t / 60, 1.2) * 0.55,
  dmgScale:   t => 1 + (t / 60) * 0.28,
  speedScale: t => 1 + Math.min(t / 700, 0.4),
  spawnDelay: t => Math.max(110, 550 - t * 5),          // ms between spawn waves
  packSize:   t => 1 + Math.floor(t / 60),              // packs grow every minute
  bossHp:     n => 420 * Math.pow(1.7, n - 1)           // n = boss number (1st, 2nd…)
};
SS.pickEnemy = function (t) {
  const pool = Object.keys(SS.ENEMIES).filter(k => SS.ENEMIES[k].minT <= t);
  let total = 0;
  for (const k of pool) total += SS.ENEMIES[k].weight;
  let r = Math.random() * total;
  for (const k of pool) { r -= SS.ENEMIES[k].weight; if (r <= 0) return k; }
  return 'grunt';
};

// ---------------------------------------------------------------------------
// Level-up draft pool. `apply` mutates the run stats object (2nd arg = scene,
// for instant effects like nukes / relic gifts / full heals).
// rarity: 0 common / 1 rare / 2 epic / 3 legendary — weight & card color.
// ---------------------------------------------------------------------------
SS.RARITY = [
  { name: 'COMMON',    color: 0x9aa7bd },
  { name: 'RARE',      color: 0x4de1ff },
  { name: 'EPIC',      color: 0xb45dff },
  { name: 'LEGENDARY', color: 0xffd34d }
];
SS.UPGRADES = [
  // ---- COMMON — solid bread & butter -------------------------------------
  { id: 'dmg',     name: 'Sharpened',    icon: 'ic_sword',  rarity: 0, desc: '+10% damage',                 apply: s => s.dmgMult *= 1.10 },
  { id: 'aspd',    name: 'Frenzy',       icon: 'ic_bolt',   rarity: 0, desc: '+10% attack speed',           apply: s => s.atkSpeed *= 1.10 },
  { id: 'speed',   name: 'Swiftness',    icon: 'ic_boot',   rarity: 0, desc: '+8% move speed',              apply: s => s.moveSpeed *= 1.08 },
  { id: 'hp',      name: 'Iron Heart',   icon: 'ic_heart',  rarity: 0, desc: '+20 max HP & heal 20',        apply: s => { s.maxHp += 20; s.hp = Math.min(s.maxHp, s.hp + 20); } },
  { id: 'magnet',  name: 'Lodestone',    icon: 'ic_magnet', rarity: 0, desc: '+25% pickup radius',          apply: s => s.magnet *= 1.25 },
  { id: 'gold',    name: 'Greed',        icon: 'ic_coin',   rarity: 0, desc: '+15% gold gain',              apply: s => s.goldMult *= 1.15 },
  { id: 'xp',      name: 'Insight',      icon: 'ic_book',   rarity: 0, desc: '+10% XP gain',                apply: s => s.xpMult *= 1.10 },
  { id: 'area',    name: 'Resonance',    icon: 'ic_ring',   rarity: 0, desc: '+12% ability area',           apply: s => s.area *= 1.12 },

  // ---- RARE — build definers ----------------------------------------------
  { id: 'crit',    name: 'Deadeye',      icon: 'ic_target', rarity: 1, desc: '+10% crit chance',            apply: s => s.critChance += 0.10 },
  { id: 'critd',   name: 'Brutality',    icon: 'ic_burst',  rarity: 1, desc: '+60% crit damage',            apply: s => s.critDmg += 0.6 },
  { id: 'regen',   name: 'Mending',      icon: 'ic_plus',   rarity: 1, desc: '+2 HP per second',            apply: s => s.regen += 2 },
  { id: 'dash',    name: 'Blink Core',   icon: 'ic_wind',   rarity: 1, desc: '-25% dash cooldown',          apply: s => s.dashCd *= 0.75 },
  { id: 'thorn',   name: 'Thornplate',   icon: 'ic_thorn',  rarity: 1, desc: 'Reflect 100% touch damage',   apply: s => s.thorns += 1 },
  { id: 'pierce',  name: 'Lancer',       icon: 'ic_fork',   rarity: 1, desc: 'Bolts pierce +2 enemies',     apply: s => s.pierceBonus += 2 },
  { id: 'chain',   name: 'Conductor',    icon: 'ic_bolt',   rarity: 1, desc: 'Lightning chains +2 hops',    apply: s => s.chainBonus += 2 },
  { id: 'armor',   name: 'Bulwark',      icon: 'ic_shield', rarity: 1, desc: '-10% damage taken',           apply: s => s.armor = Math.min(0.7, s.armor + 0.10) },
  { id: 'dodge',   name: 'Phantom Step', icon: 'ic_wind',   rarity: 1, desc: '+8% dodge chance',            apply: s => s.dodge = Math.min(0.6, s.dodge + 0.08) },
  { id: 'luck',    name: 'Fortune\'s Eye', icon: 'ic_star', rarity: 1, desc: '+35% relic drop luck',        apply: s => s.luck += 0.35 },
  { id: 'combod',  name: 'Bloodlust',    icon: 'ic_flame',  rarity: 1, desc: '+0.6% damage per combo (max 50)', apply: s => s.comboDmg += 0.006 },
  { id: 'goldk',   name: 'Bounty Hunter', icon: 'ic_coin',  rarity: 1, desc: '+1 gold per kill',            apply: s => s.goldOnKill += 1 },

  // ---- EPIC — the run changes here ----------------------------------------
  { id: 'vamp',    name: 'Vampiric',     icon: 'ic_heart',  rarity: 2, desc: 'Heal 2 HP per kill',          apply: s => s.lifesteal += 2 },
  { id: 'shield',  name: 'Aegis Core',   icon: 'ic_shield', rarity: 2, desc: 'Block a hit every 10s',       apply: s => s.shieldMax += 1 },
  { id: 'proj',    name: 'Splitter',     icon: 'ic_fork',   rarity: 2, desc: '+1 projectile per Bolt',      apply: s => s.projCount += 1 },
  { id: 'orbit',   name: 'Ring Widening', icon: 'ic_ring',  rarity: 2, desc: '+20% orbit speed & radius',   apply: s => { s.orbitSpeed *= 1.20; s.orbitRadius *= 1.20; } },
  { id: 'exec',    name: 'Reaper\'s Mark', icon: 'ic_skull', rarity: 2, desc: 'Instantly kill foes under 12% HP', apply: s => s.execute = Math.min(0.4, s.execute + 0.12) },
  { id: 'dashd',   name: 'Comet Dash',   icon: 'ic_wind',   rarity: 2, desc: 'Dashing detonates a shockwave', apply: s => s.dashDmg += 1 },
  { id: 'bossd',   name: 'Titanbane',    icon: 'ic_skull',  rarity: 2, desc: '+30% damage vs Titans',       apply: s => s.bossDmg += 0.30 },
  { id: 'fury',    name: 'Stormfury',    icon: 'ic_bolt',   rarity: 2, desc: '+25% attack speed',           apply: s => s.atkSpeed *= 1.25 },
  { id: 'might',   name: 'Colossus Might', icon: 'ic_sword', rarity: 2, desc: '+30% damage',                apply: s => s.dmgMult *= 1.30 },
  { id: 'sanct',   name: 'Sanctuary',    icon: 'ic_plus',   rarity: 2, desc: 'Full heal & +25 max HP',      apply: s => { s.maxHp += 25; s.hp = s.maxHp; } },

  // ---- LEGENDARY — the "OOOH" cards ----------------------------------------
  { id: 'forge',   name: 'Gift of the Forge', icon: 'ic_star', rarity: 3, desc: 'Instantly gain an EPIC relic', apply: (s, g) => g && g.addRelic(SS.randomRelicType(), 3) },
  { id: 'slot',    name: 'Astral Socket', icon: 'ic_ring',   rarity: 3, desc: '+1 relic orbit slot',        apply: (s, g) => { if (g) { g.maxSlots++; g.ui.setRelics(g.relics, g.maxSlots); } } },
  { id: 'twin',    name: 'Twin Storm',   icon: 'ic_fork',   rarity: 3, desc: '+2 projectiles & +15% damage', apply: s => { s.projCount += 2; s.dmgMult *= 1.15; } },
  { id: 'god',     name: 'Godslayer',    icon: 'ic_sword',  rarity: 3, desc: '+50% damage',                 apply: s => s.dmgMult *= 1.50 },
  { id: 'chrono',  name: 'Chrono Core',  icon: 'ic_clock',  rarity: 3, desc: '+30% attack speed & -30% dash CD', apply: s => { s.atkSpeed *= 1.30; s.dashCd *= 0.70; } },
  { id: 'avatar',  name: 'Avatar of War', icon: 'ic_heart', rarity: 3, desc: '+60 max HP, full heal, +3 regen', apply: s => { s.maxHp += 60; s.hp = s.maxHp; s.regen += 3; } },
  { id: 'nuke',    name: 'Cataclysm',    icon: 'ic_burst',  rarity: 3, desc: 'Obliterate everything on screen', apply: (s, g) => g && g.cataclysm() },
  { id: 'phoenix', name: 'Phoenix Soul', icon: 'ic_flame',  rarity: 3, desc: '+1 free revive',              apply: (s, g) => { if (g) g.revives++; } }
];
SS.rollUpgrades = function (n) {
  const weights = [55, 30, 12, 3]; // by rarity — legendaries are EVENTS
  const pool = SS.UPGRADES.slice();
  const out = [];
  while (out.length < n && pool.length) {
    let total = 0;
    for (const u of pool) total += weights[u.rarity];
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[pool[i].rarity];
      if (r <= 0) { out.push(pool.splice(i, 1)[0]); break; }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Bosses — six Titans, each with a unique attack pattern. They rotate in
// spawn order; hp scales with the boss counter.
// ---------------------------------------------------------------------------
SS.BOSSES = [
  { id: 'pyre',  name: 'PYRE COLOSSUS', tex: 'boss',  color: 0xff5347, hpMult: 1.0,  speed: 42, pattern: 'ring',
    desc: 'radial bullet storms + charges' },
  { id: 'frost', name: 'FROST MONARCH', tex: 'boss2', color: 0x9fd8ff, hpMult: 1.15, speed: 34, pattern: 'spiral',
    desc: 'rotating spiral barrage' },
  { id: 'void',  name: 'VOID MAW',      tex: 'boss3', color: 0xb45dff, hpMult: 0.9,  speed: 30, pattern: 'teleport',
    desc: 'teleports and spits bullet fans' },
  { id: 'storm', name: 'STORM HERALD',  tex: 'boss2', color: 0xffe94d, hpMult: 0.85, speed: 62, pattern: 'storm',
    desc: 'fast hunter, calls minions' },
  { id: 'blade', name: 'BLADE QUEEN',   tex: 'boss3', color: 0xff9c3f, hpMult: 1.0,  speed: 48, pattern: 'blades',
    desc: 'relentless double charges' },
  { id: 'gild',  name: 'GILDED TITAN',  tex: 'boss',  color: 0xffd34d, hpMult: 1.6,  speed: 26, pattern: 'summon', goldMult: 3,
    desc: 'summoner colossus, triple gold' }
];

// ---------------------------------------------------------------------------
// Meta shop — permanent upgrades bought with gold between runs
// ---------------------------------------------------------------------------
SS.META = [
  { id: 'vit',    name: 'Vitality',    icon: 'ic_heart',  desc: '+20 max HP per level',        base: 100, mult: 1.8, max: 10 },
  { id: 'pow',    name: 'Power',       icon: 'ic_sword',  desc: '+8% damage per level',        base: 120, mult: 1.8, max: 10 },
  { id: 'swift',  name: 'Swiftness',   icon: 'ic_boot',   desc: '+4% move speed per level',    base: 100, mult: 1.9, max: 8 },
  { id: 'magnet', name: 'Magnetism',   icon: 'ic_magnet', desc: '+15% pickup radius per level',base: 80,  mult: 1.9, max: 8 },
  { id: 'fortune',name: 'Fortune',     icon: 'ic_coin',   desc: '+10% gold gain per level',    base: 150, mult: 2.0, max: 10 },
  { id: 'wisdom', name: 'Wisdom',      icon: 'ic_book',   desc: '+8% XP gain per level',       base: 150, mult: 2.0, max: 10 },
  { id: 'crit',   name: 'Keen Edge',   icon: 'ic_target', desc: '+3% crit chance per level',   base: 200, mult: 2.1, max: 5 },
  { id: 'starter',name: 'Head Start',  icon: 'ic_star',   desc: 'Begin runs with +1 random relic', base: 500, mult: 3.0, max: 3 },
  { id: 'slot',   name: 'Orbit Slot',  icon: 'ic_ring',   desc: '+1 relic orbit slot',         base: 800, mult: 3.5, max: 2 },
  { id: 'revive', name: 'Phoenix',     icon: 'ic_flame',  desc: '+1 free revive per run',      base: 1500, mult: 4.0, max: 2 }
];
SS.metaCost = (m, lvl) => Math.floor(m.base * Math.pow(m.mult, lvl));

// ---------------------------------------------------------------------------
// Pets — collectible companions with passive powers
// ---------------------------------------------------------------------------
SS.PETS = [
  { id: 'wisp',  name: 'Wisp',  icon: 'ic_star',   color: 0x9fd8ff, desc: 'Collects loot for you',   unlock: 'Reach a 3-day daily streak' },
  { id: 'bitzy', name: 'Bitzy', icon: 'ic_target', color: 0xffe94d, desc: 'Tiny turret, shoots foes', unlock: 'Defeat 5 bosses (total)' },
  { id: 'hartl', name: 'Hartl', icon: 'ic_plus',   color: 0xff6bd6, desc: 'Heals 1 HP every 3s',      unlock: 'Reach level 15 in one run' },
  { id: 'nyx',   name: 'Nyx',   icon: 'ic_coin',   color: 0xb45dff, desc: '+25% gold gain',           unlock: 'Earn 10,000 total gold' }
];

// ---------------------------------------------------------------------------
// Achievements — checked against lifetime stats after each run/event
// ---------------------------------------------------------------------------
SS.ACHIEVEMENTS = [
  { id: 'kill100',   name: 'Culling',        desc: 'Kill 100 enemies (total)',    gem: 1, check: st => st.totalKills >= 100 },
  { id: 'kill1000',  name: 'Exterminator',   desc: 'Kill 1,000 enemies (total)',  gem: 2, check: st => st.totalKills >= 1000 },
  { id: 'kill10000', name: 'Stormbringer',   desc: 'Kill 10,000 enemies (total)', gem: 5, check: st => st.totalKills >= 10000 },
  { id: 'boss1',     name: 'Titan Slayer',   desc: 'Defeat your first boss',      gem: 1, check: st => st.bossKills >= 1 },
  { id: 'boss5',     name: 'Titan Hunter',   desc: 'Defeat 5 bosses',             gem: 2, check: st => st.bossKills >= 5 },
  { id: 'boss25',    name: 'Titan Reaper',   desc: 'Defeat 25 bosses',            gem: 5, check: st => st.bossKills >= 25 },
  { id: 'merge10',   name: 'Apprentice Smith', desc: 'Merge 10 relics (total)',   gem: 1, check: st => st.totalMerges >= 10 },
  { id: 'merge100',  name: 'Master Smith',   desc: 'Merge 100 relics (total)',    gem: 3, check: st => st.totalMerges >= 100 },
  { id: 'legend',    name: 'Legendary!',     desc: 'Forge a Legendary relic',     gem: 5, check: st => st.legendForged >= 1 },
  { id: 'time10',    name: 'Survivor',       desc: 'Survive 10 minutes',          gem: 2, check: st => st.bestTime >= 600 },
  { id: 'time20',    name: 'Unkillable',     desc: 'Survive 20 minutes',          gem: 5, check: st => st.bestTime >= 1200 },
  { id: 'gold10k',   name: 'Dragon Hoard',   desc: 'Earn 10,000 gold (total)',    gem: 3, check: st => st.totalGold >= 10000 },
  { id: 'lvl15',     name: 'Ascendant',      desc: 'Reach level 15 in one run',   gem: 2, check: st => st.bestLevel >= 15 },
  { id: 'lvl30',     name: 'Transcendent',   desc: 'Reach level 30 in one run',   gem: 5, check: st => st.bestLevel >= 30 }
];

// ---------------------------------------------------------------------------
// Daily missions — 3 rolled per calendar day from this pool
// ---------------------------------------------------------------------------
SS.MISSION_POOL = [
  { id: 'mkill',  name: 'Kill 150 enemies',    target: 150, stat: 'kills',  gold: 200 },
  { id: 'mboss',  name: 'Defeat 2 bosses',     target: 2,   stat: 'bosses', gold: 300 },
  { id: 'mmerge', name: 'Merge 8 relics',      target: 8,   stat: 'merges', gold: 250 },
  { id: 'mgold',  name: 'Collect 500 gold',    target: 500, stat: 'gold',   gold: 200 },
  { id: 'mtime',  name: 'Survive 6 min total', target: 360, stat: 'time',   gold: 250 },
  { id: 'mlvl',   name: 'Reach level 8',       target: 8,   stat: 'level',  gold: 200 }
];

// Daily reward table (loops after 7 days, scaled by streak)
SS.DAILY_REWARDS = [100, 150, 200, 300, 400, 500, 1000];

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------
SS.fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString();
SS.todayKey = () => new Date().toISOString().slice(0, 10);
