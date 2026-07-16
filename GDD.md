# SHARDSTORM — Game Design Document

## 1. High Concept
**Genre:** Hybrid-casual Arena Survivor × Merge × Roguelite × Idle Meta-Progression
**Pitch:** You are the Forge Golem. You never pick your weapons — your enemies *are* your weapons.
Every slain enemy can drop a **weapon fragment**. Fragments instantly forge into **Relics** that
orbit you and attack automatically. Two identical Relics **auto-merge** into a stronger tier.
Orbit slots are limited, so every fragment is a micro-decision delivered as a dopamine hit.

**Learn in 10 seconds:** Move. Everything else is automatic. Survive.

## 2. The Original Hook (why this isn't Vampire Survivors / Brotato / Survivor.io)
- **Loot = Weapons = Merge board.** There is no shop mid-run and no weapon-select screen for weapons:
  your orbit ring is a live merge board that fills from enemy drops (variable reward).
- **Orbit slots create tension:** when the ring is full, new fragments auto-merge if possible,
  otherwise convert to gold — so players chase *matching* drops (collection + curiosity).
- **The ring is spatial:** relics physically orbit you; melee relics hit what they touch, so
  movement doubles as aiming. Dash re-spins the ring, creating a skill expression.

## 3. Core Loop (seconds)
Kill → drop (gold / XP / fragment, variable) → forge/merge relic → stronger → kill faster.

## 4. Session Loop (minutes)
Level-up every ~25s → pick 1-of-3 upgrades → boss every 120s → rare reward + slow-mo kill →
difficulty scales infinitely → death → gold banked → meta shop → "one more run".

## 5. Meta Loop (days)
Daily reward streak → daily missions → achievements → pets unlock → permanent upgrades.

## 6. Systems
### Relics (weapons) — 6 types × 5 tiers
| Relic  | Behavior | Color |
|--------|----------|-------|
| Bolt   | Fires projectile at nearest enemy | cyan |
| Blade  | Orbiting melee, contact damage | orange |
| Frost  | Radial pulse that slows | ice blue |
| Ember  | Lobs firebombs, burn area | red |
| Volt   | Chain lightning between enemies | yellow |
| Void   | Pulls enemies in, DoT (rare drop) | purple |

Merging: two identical (type+tier) → one relic of tier+1. Tier multiplies damage ×2.2 and
improves rate. Tier colors follow loot rarity: Common→Uncommon→Rare→Epic→Legendary.

### Level-Up Draft
XP orbs fill the bar; each level pauses action and offers **3 random upgrades** (damage, attack
speed, crit chance/damage, move speed, max HP, regen, magnet, extra projectile, dash cooldown,
gold/XP gain). Rarity-weighted, stackable.

### Bosses
Every 120s. HP scales with time. Telegraphed radial attacks. On death: **hit-stop + slow-motion
+ screen flash**, guaranteed Epic fragment + gold shower + gem.

### Difficulty
Spawn rate, enemy HP and damage scale on smooth exponential curves with elapsed time. Infinite.

### Combo & Crits
Kills within 2s chain a combo counter (gold multiplier up to ×3). Crits show big yellow numbers.

### Pets (collection)
| Pet | Unlock | Power |
|-----|--------|-------|
| Wisp | default reward day 3 | auto-collects loot |
| Bitzy | kill 5 bosses | tiny turret |
| Hartl | reach level 15 | heals 1 HP/3s |
| Nyx | earn 10,000 gold | +25% gold |

### Meta Shop (permanent, gold)
Vitality, Power, Swiftness, Magnetism, Fortune, Wisdom (XP), Extra orbit slot, Revive charge.
Escalating costs; every purchase is felt immediately next run.

### Retention Mechanics Map
- Variable rewards → fragment drops, rarity rolls, crit rolls
- Progression → XP bar, meta shop, tier merges
- Curiosity → "what drops next", locked pets, ??? achievements
- Completion → missions (3 daily), achievements grid
- Collection → pets, relic tiers seen
- Permanent upgrades → meta shop
- One-more-run → death screen shows gold earned + nearest unlock + Continue (revive) button

## 7. Controls
- **Desktop:** WASD / arrows to move, Space/Shift to dash, Esc/P pause.
- **Mobile:** floating virtual joystick (touch anywhere), double-tap to dash.

## 8. Art Direction
Flat vector minimalism. Dark navy arena with soft grid. Neon accent palette per relic type.
Everything procedurally drawn (zero image files). Chunky rounded shapes, heavy glow, juicy
tweens (squash on hit, pop on spawn, floaty damage numbers).

## 9. Audio
WebAudio-synthesized SFX (no files): pickup blips, merge chime arpeggio, boss alarm, explosion
noise bursts, level-up fanfare. Master mute + volume in settings, persisted.

## 10. Tech
Phaser 3 (CDN), vanilla JS modules, LocalStorage saves, object pooling for
projectiles/enemies/particles/texts, single draw-call-friendly generated texture atlas.
Target: 60 FPS on mid phones, < 1 MB total download (engine aside).
