// ============================================================================
// SHARDSTORM — save.js
// LocalStorage persistence: gold, gems, meta upgrades, pets, achievements,
// daily missions, daily reward streak, lifetime stats, settings.
// ============================================================================

SS.Save = {
  KEY: 'shardstorm_save_v1',
  data: null,

  defaults() {
    return {
      gold: 0,
      gems: 0,
      meta: {},                 // metaId -> level
      pets: { unlocked: [], active: null },
      ach: [],                  // unlocked achievement ids
      missions: { date: '', list: [], progress: {}, claimed: [] },
      daily: { lastClaim: '', streak: 0 },
      stats: {
        totalKills: 0, totalGold: 0, bossKills: 0, totalMerges: 0,
        legendForged: 0, bestTime: 0, bestLevel: 0, runs: 0
      },
      settings: { sound: true, music: true, shake: true }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.data = raw ? Object.assign(this.defaults(), JSON.parse(raw)) : this.defaults();
      // deep-merge nested defaults so old saves survive schema additions
      const d = this.defaults();
      for (const k of ['pets', 'missions', 'daily', 'stats', 'settings'])
        this.data[k] = Object.assign(d[k], this.data[k]);
    } catch (e) {
      console.warn('Save corrupted, resetting', e);
      this.data = this.defaults();
    }
    this.rollMissions();
    return this.data;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { /* storage may be unavailable (private mode) — play sessionless */ }
  },

  // --- meta shop -----------------------------------------------------------
  metaLevel(id) { return this.data.meta[id] || 0; },
  buyMeta(m) {
    const lvl = this.metaLevel(m.id);
    const cost = SS.metaCost(m, lvl);
    if (lvl >= m.max || this.data.gold < cost) return false;
    this.data.gold -= cost;
    this.data.meta[m.id] = lvl + 1;
    this.save();
    return true;
  },

  // --- daily missions ------------------------------------------------------
  rollMissions() {
    const today = SS.todayKey();
    if (this.data.missions.date === today) return;
    // deterministic-ish pick of 3 missions for the day
    const pool = SS.MISSION_POOL.slice();
    const list = [];
    let seed = 0;
    for (const c of today) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    while (list.length < 3 && pool.length) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      list.push(pool.splice(seed % pool.length, 1)[0].id);
    }
    this.data.missions = { date: today, list, progress: {}, claimed: [] };
    this.save();
  },
  missionProgress(id, amount) {
    const p = this.data.missions.progress;
    p[id] = (p[id] || 0) + amount;
  },
  missionSet(id, value) { // for "best value" style missions (level)
    const p = this.data.missions.progress;
    p[id] = Math.max(p[id] || 0, value);
  },

  // --- daily reward --------------------------------------------------------
  dailyAvailable() { return this.data.daily.lastClaim !== SS.todayKey(); },
  claimDaily() {
    const today = SS.todayKey();
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const d = this.data.daily;
    d.streak = (d.lastClaim === yest) ? d.streak + 1 : 1;
    d.lastClaim = today;
    const reward = SS.DAILY_REWARDS[(d.streak - 1) % 7];
    this.data.gold += reward;
    this.checkPets();
    this.save();
    return { reward, streak: d.streak };
  },

  // --- achievements & pets -------------------------------------------------
  // Returns list of freshly unlocked achievements (for toasts)
  checkAchievements() {
    const fresh = [];
    for (const a of SS.ACHIEVEMENTS) {
      if (!this.data.ach.includes(a.id) && a.check(this.data.stats)) {
        this.data.ach.push(a.id);
        this.data.gems += a.gem;
        fresh.push(a);
      }
    }
    if (fresh.length) this.save();
    return fresh;
  },
  checkPets() {
    const st = this.data.stats, p = this.data.pets;
    const cond = {
      wisp: this.data.daily.streak >= 3,
      bitzy: st.bossKills >= 5,
      hartl: st.bestLevel >= 15,
      nyx: st.totalGold >= 10000
    };
    const fresh = [];
    for (const pet of SS.PETS) {
      if (cond[pet.id] && !p.unlocked.includes(pet.id)) {
        p.unlocked.push(pet.id);
        if (!p.active) p.active = pet.id; // auto-equip first pet
        fresh.push(pet);
      }
    }
    if (fresh.length) this.save();
    return fresh;
  }
};
