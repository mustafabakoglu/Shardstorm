// ============================================================================
// SHARDSTORM — textures.js
// All art is generated at boot with Phaser Graphics: detailed vector sprites
// plus a full flat-design icon set (no emojis anywhere in the UI).
// White areas accept tint; black details stay dark under any tint.
// ============================================================================

SS.generateTextures = function (scene) {
  const g = scene.add.graphics();

  function bake(key, w, h, draw) {
    g.clear();
    draw(g, w, h);
    g.generateTexture(key, w, h);
  }
  function poly(gr, cx, cy, r, sides, rot = 0) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    gr.fillPoints(pts, true);
  }
  function spikes(gr, cx, cy, rIn, rOut, n, rot = 0) {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const a2 = a + Math.PI / n;
      gr.fillPoints([
        { x: cx + Math.cos(a) * rIn, y: cy + Math.sin(a) * rIn },
        { x: cx + Math.cos((a + a2) / 2) * rOut, y: cy + Math.sin((a + a2) / 2) * rOut },
        { x: cx + Math.cos(a2) * rIn, y: cy + Math.sin(a2) * rIn }
      ], true);
    }
  }

  // ==========================================================================
  // HERO — stone golem: bulky rocky shoulders, glowing orange magic runes
  // ==========================================================================
  bake('hero', 52, 52, (g) => {
    // Rocky body
    g.fillStyle(0x4a4341); // dark grey/brown
    poly(g, 26, 26, 24, 6, Math.PI / 6);
    
    // Shoulders
    g.fillStyle(0x5c5451);
    g.fillCircle(14, 26, 12);
    g.fillCircle(38, 26, 12);
    
    // Head/Chest block
    g.fillStyle(0x6e6561);
    g.fillRoundedRect(18, 14, 16, 22, 4);
    
    // Glowing orange runes/cracks
    g.lineStyle(2, 0xff9c3f, 1);
    g.beginPath();
    g.moveTo(22, 18); g.lineTo(26, 24); g.lineTo(30, 18);
    g.moveTo(26, 24); g.lineTo(26, 32);
    g.strokePath();

    // Angry glowing eyes
    g.fillStyle(0xffffff);
    g.fillTriangle(20, 20, 25, 21, 21, 23);
    g.fillTriangle(32, 20, 27, 21, 31, 23);
    
    // Inner eye glow
    g.fillStyle(0xffe94d);
    g.fillCircle(22, 21, 1.5);
    g.fillCircle(30, 21, 1.5);
  });
  bake('hero_core', 40, 40, (g) => {      // pulsing glow layered under the hero
    for (let i = 7; i > 0; i--) { g.fillStyle(0xff9c3f, 0.08 * (8 - i) / 3); g.fillCircle(20, 20, i * 2.8); }
  });

  // ==========================================================================
  // ENEMIES — white base takes tint, black details stay dark
  // ==========================================================================
  bake('e_tri', 46, 46, (g) => {          // GRUNT: spiky blob, one big eye
    g.fillStyle(0xffffff);
    spikes(g, 23, 23, 15, 22, 9);
    g.fillCircle(23, 23, 16);
    g.fillStyle(0x000000, 0.35); g.fillCircle(23, 27, 11);       // jaw shadow
    g.fillStyle(0x10131c); g.fillCircle(23, 20, 8);              // eye socket
    g.fillStyle(0xffffff); g.fillCircle(25, 18, 3.4);            // pupil shine
    g.fillStyle(0x000000, 0.5);                                   // frown brow
    g.fillTriangle(12, 12, 22, 15, 13, 18);
    g.fillTriangle(34, 12, 24, 15, 33, 18);
  });
  bake('e_dart', 46, 46, (g) => {         // RUNNER: sleek dart with fins & eye slit
    g.fillStyle(0xffffff);
    g.fillPoints([{x:23,y:2},{x:34,y:26},{x:40,y:40},{x:23,y:31},{x:6,y:40},{x:12,y:26}], true);
    g.fillStyle(0x000000, 0.3);
    g.fillPoints([{x:23,y:10},{x:29,y:26},{x:23,y:29},{x:17,y:26}], true);
    g.fillStyle(0x10131c); g.fillRoundedRect(17, 14, 12, 4, 2);   // visor slit
    g.fillStyle(0xffffff); g.fillRoundedRect(19, 15, 4, 2, 1);
  });
  bake('e_hex', 64, 64, (g) => {          // BRUTE: cracked armored hexagon, angry eyes
    g.fillStyle(0xffffff); poly(g, 32, 32, 30, 6, Math.PI / 6);
    g.fillStyle(0x000000, 0.25); poly(g, 32, 32, 24, 6, Math.PI / 6);
    g.fillStyle(0xffffff); poly(g, 32, 32, 18, 6, Math.PI / 6);
    // cracks
    g.lineStyle(2, 0x10131c, 0.8);
    g.lineBetween(14, 20, 24, 30); g.lineBetween(24, 30, 20, 40);
    g.lineBetween(50, 22, 42, 34); g.lineBetween(42, 34, 47, 44);
    // eyes
    g.fillStyle(0x10131c);
    g.fillTriangle(18, 26, 30, 30, 19, 34);
    g.fillTriangle(46, 26, 34, 30, 45, 34);
    g.fillStyle(0xffffff); g.fillCircle(24, 30, 2); g.fillCircle(40, 30, 2);
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(22, 42, 20, 5, 2); // grim mouth
  });
  bake('e_dia', 48, 48, (g) => {          // SPITTER: diamond with toothy maw
    g.fillStyle(0xffffff); poly(g, 24, 24, 22, 4);
    g.fillStyle(0x000000, 0.25); poly(g, 24, 24, 16, 4);
    g.fillStyle(0x10131c); g.fillCircle(24, 26, 8);               // maw
    g.fillStyle(0xffffff);                                         // teeth
    g.fillTriangle(19, 20, 23, 20, 21, 25);
    g.fillTriangle(25, 20, 29, 20, 27, 25);
    g.fillStyle(0x10131c); g.fillCircle(18, 13, 3); g.fillCircle(30, 13, 3); // eyes
    g.fillStyle(0xffffff); g.fillCircle(19, 12, 1.2); g.fillCircle(31, 12, 1.2);
  });
  bake('boss', 140, 140, (g) => {         // BOSS: layered spiked colossus
    g.fillStyle(0xffffff);
    spikes(g, 70, 70, 48, 68, 10);
    poly(g, 70, 70, 52, 10, Math.PI / 10);
    g.fillStyle(0x000000, 0.28); poly(g, 70, 70, 42, 10, Math.PI / 10);
    g.fillStyle(0xffffff); poly(g, 70, 70, 32, 8, Math.PI / 8);
    g.fillStyle(0x000000, 0.4); g.fillCircle(70, 70, 24);
    g.fillStyle(0xffffff); g.fillCircle(70, 70, 14);              // core (tints)
    // three angry eyes
    g.fillStyle(0x10131c);
    g.fillTriangle(44, 48, 62, 56, 46, 60);
    g.fillTriangle(96, 48, 78, 56, 94, 60);
    g.fillCircle(70, 44, 6);
    g.fillStyle(0xffffff); g.fillCircle(52, 55, 2.5); g.fillCircle(88, 55, 2.5); g.fillCircle(71, 43, 2.5);
  });
  bake('boss2', 140, 140, (g) => {        // BOSS 2: crowned monarch — rings + crown spikes
    // crown spikes on top
    g.fillStyle(0xffffff);
    for (let i = -2; i <= 2; i++) {
      const x = 70 + i * 22;
      g.fillTriangle(x - 9, 34, x + 9, 34, x, 6 + Math.abs(i) * 6);
    }
    // layered body rings
    g.fillCircle(70, 76, 54);
    g.fillStyle(0x000000, 0.28); g.fillCircle(70, 76, 44);
    g.fillStyle(0xffffff); g.fillCircle(70, 76, 34);
    g.fillStyle(0x000000, 0.4); g.fillCircle(70, 76, 22);
    g.fillStyle(0xffffff); g.fillCircle(70, 76, 12);
    // regal slit eyes
    g.fillStyle(0x10131c);
    g.fillRoundedRect(42, 62, 20, 7, 3); g.fillRoundedRect(78, 62, 20, 7, 3);
    g.fillStyle(0xffffff); g.fillRoundedRect(46, 64, 6, 3, 1.5); g.fillRoundedRect(88, 64, 6, 3, 1.5);
    // grim mouth
    g.fillStyle(0x000000, 0.55); g.fillRoundedRect(56, 94, 28, 6, 3);
  });
  bake('boss3', 140, 140, (g) => {        // BOSS 3: angular fanged maw
    g.fillStyle(0xffffff);
    poly(g, 70, 70, 60, 4);                              // big diamond
    g.fillStyle(0x000000, 0.25); poly(g, 70, 70, 48, 4);
    g.fillStyle(0xffffff); poly(g, 70, 70, 36, 4);
    // gaping maw
    g.fillStyle(0x10131c); g.fillCircle(70, 78, 22);
    g.fillStyle(0xffffff);                               // fangs
    for (let i = 0; i < 5; i++) {
      const x = 52 + i * 9;
      g.fillTriangle(x, 60, x + 8, 60, x + 4, 74);
      g.fillTriangle(x, 96, x + 8, 96, x + 4, 82);
    }
    // four eyes
    g.fillStyle(0x10131c);
    g.fillCircle(48, 46, 6); g.fillCircle(92, 46, 6);
    g.fillCircle(58, 36, 4); g.fillCircle(82, 36, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(50, 44, 2); g.fillCircle(94, 44, 2);
    g.fillCircle(59, 35, 1.4); g.fillCircle(83, 35, 1.4);
  });

  // ==========================================================================
  // RELIC SHARD, PICKUPS
  // ==========================================================================
  bake('relic', 32, 32, (g) => {
    g.fillStyle(0x000000, 0.35);
    g.fillPoints([{x:16,y:2},{x:29,y:12},{x:24,y:30},{x:8,y:30},{x:3,y:12}], true);
    g.fillStyle(0xffffff);
    g.fillPoints([{x:16,y:1},{x:28,y:11},{x:23,y:28},{x:9,y:28},{x:4,y:11}], true);
    g.fillStyle(0x000000, 0.22);
    g.fillPoints([{x:16,y:1},{x:28,y:11},{x:16,y:14}], true);
    g.fillStyle(0xffffff, 0.8);
    g.fillPoints([{x:16,y:5},{x:10,y:11},{x:16,y:13}], true);
  });
  bake('gold', 18, 18, (g) => {
    g.fillStyle(0x8a5b00); g.fillCircle(9, 9, 8);
    g.fillStyle(0xffd34d); g.fillCircle(9, 9, 7);
    g.fillStyle(0xb8860b); g.fillCircle(9, 9, 4.5);
    g.fillStyle(0xffd34d); poly(g, 9, 9, 3, 4);
    g.fillStyle(0xfff3b0); g.fillCircle(6, 6, 2);
  });
  bake('xp', 14, 14, (g) => {
    g.fillStyle(0x1d5c20); poly(g, 7, 7, 7, 4);
    g.fillStyle(0x53e05a); poly(g, 7, 7, 5.5, 4);
    g.fillStyle(0xbdf7c0); poly(g, 7, 7, 2.5, 4);
  });
  bake('frag', 24, 24, (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:12,y:0},{x:15,y:9},{x:24,y:12},{x:15,y:15},{x:12,y:24},{x:9,y:15},{x:0,y:12},{x:9,y:9}], true);
    g.fillStyle(0x000000, 0.25); poly(g, 12, 12, 4, 4);
  });
  bake('gem', 20, 20, (g) => {
    g.fillStyle(0x0e5c44); poly(g, 10, 10, 9, 6, Math.PI / 6);
    g.fillStyle(0x5dffc8); poly(g, 10, 10, 7.5, 6, Math.PI / 6);
    g.fillStyle(0x0e5c44, 0.5); g.fillTriangle(10, 3, 10, 17, 16, 10);
    g.fillStyle(0xd2fff0); g.fillCircle(7.5, 7, 2.2);
  });
  bake('magnet', 28, 28, (g) => {
    g.fillStyle(0xc23b3b); g.fillRect(5, 2, 8, 15); g.fillRect(15, 2, 8, 15);
    g.fillStyle(0xff6b6b); g.fillRect(6, 2, 6, 13); g.fillRect(16, 2, 6, 13);
    g.fillStyle(0xe8edf5); g.fillRect(5, 17, 8, 7); g.fillRect(15, 17, 8, 7);
    g.fillStyle(0xc23b3b); g.fillRect(5, 12, 18, 5);
    g.fillStyle(0xff6b6b); g.fillRect(6, 13, 16, 3);
  });
  bake('heart', 22, 22, (g) => {
    g.fillStyle(0xa11f2e);
    g.fillCircle(6.5, 8, 6.2); g.fillCircle(15.5, 8, 6.2);
    g.fillPoints([{x:0.8,y:10.5},{x:21.2,y:10.5},{x:11,y:21.5}], true);
    g.fillStyle(0xff5a5a);
    g.fillCircle(6.5, 7.4, 5.2); g.fillCircle(15.5, 7.4, 5.2);
    g.fillPoints([{x:2.2,y:9.6},{x:19.8,y:9.6},{x:11,y:19.6}], true);
    g.fillStyle(0xffb3b3); g.fillCircle(6, 6, 2);
  });

  // ==========================================================================
  // PROJECTILES & FX
  // ==========================================================================
  bake('proj', 16, 16, (g) => {
    g.fillStyle(0xffffff, 0.35); g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(8, 8, 5.5);
    g.fillStyle(0xffffff); g.fillCircle(8, 8, 3.2);
  });
  bake('bomb', 18, 18, (g) => {
    g.fillStyle(0xffffff); g.fillCircle(9, 9, 8);
    g.fillStyle(0x000000, 0.35); g.fillCircle(9, 9, 5);
    g.fillStyle(0xffffff); g.fillCircle(9, 9, 2.4);
  });
  bake('eproj', 14, 14, (g) => {
    g.fillStyle(0xffffff, 0.4); g.fillCircle(7, 7, 7);
    g.fillStyle(0xffffff); poly(g, 7, 7, 5, 4);
    g.fillStyle(0x000000, 0.4); poly(g, 7, 7, 2.4, 4);
  });
  bake('dot', 8, 8, (g) => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); });
  bake('spark', 14, 4, (g) => {           // directional hit spark
    g.fillStyle(0xffffff); g.fillPoints([{x:0,y:2},{x:9,y:0},{x:14,y:2},{x:9,y:4}], true);
  });
  bake('ring', 64, 64, (g) => { g.lineStyle(4, 0xffffff); g.strokeCircle(32, 32, 29); });
  bake('glow', 64, 64, (g) => {
    for (let i = 8; i > 0; i--) { g.fillStyle(0xffffff, 0.05 * (9 - i) / 4); g.fillCircle(32, 32, i * 4); }
  });
  bake('shadow', 40, 16, (g) => { g.fillStyle(0x000000, 0.3); g.fillEllipse(20, 8, 38, 14); });
  bake('vignette', 128, 128, (g) => {     // red edge vignette for the hurt flash
    for (let i = 0; i < 14; i++) {
      g.lineStyle(6, 0xff2233, 0.028 * (14 - i));
      g.strokeRect(i * 3, i * 3, 128 - i * 6, 128 - i * 6);
    }
  });
  bake('shieldfx', 72, 72, (g) => {       // shield bubble around the hero
    g.lineStyle(3, 0xff9c3f, 0.9); g.strokeCircle(36, 36, 32);
    g.fillStyle(0xff9c3f, 0.10); g.fillCircle(36, 36, 32);
    g.lineStyle(1.5, 0xffd34d, 0.6); g.strokeCircle(36, 36, 27);
  });

  bake('pet', 26, 26, (g) => {
    g.fillStyle(0x000000, 0.3); g.fillCircle(13, 14, 11);
    g.fillStyle(0xffffff); g.fillCircle(13, 13, 10.5);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(5, 8, 3); g.fillCircle(21, 8, 3); // ears
    g.fillStyle(0x10131c); g.fillCircle(9.5, 11, 2.2); g.fillCircle(16.5, 11, 2.2);
    g.fillStyle(0xffffff); g.fillCircle(10, 10.4, 0.9); g.fillCircle(17, 10.4, 0.9);
    g.fillStyle(0x10131c, 0.6); g.fillRoundedRect(10, 16, 6, 2.4, 1.2);       // smile
  });

  bake('joy_base', 110, 110, (g) => {
    g.fillStyle(0xffffff, 0.07); g.fillCircle(55, 55, 54);
    g.lineStyle(2, 0xffffff, 0.22); g.strokeCircle(55, 55, 53);
    g.lineStyle(1, 0xffffff, 0.12); g.strokeCircle(55, 55, 34);
  });
  bake('joy_thumb', 48, 48, (g) => {
    g.fillStyle(0xffffff, 0.22); g.fillCircle(24, 24, 23);
    g.lineStyle(2, 0xffffff, 0.35); g.strokeCircle(24, 24, 22);
  });
  bake('px', 2, 2, (g) => { g.fillStyle(0xffffff); g.fillRect(0, 0, 2, 2); });

  // ==========================================================================
  // ICON SET — 40×40, white, tintable. Flat & geometric (no emoji anywhere).
  // ==========================================================================
  const IC = (key, draw) => bake(key, 40, 40, draw);

  IC('ic_sword', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:26,y:4},{x:32,y:10},{x:16,y:26},{x:10,y:20}], true);   // blade
    g.fillPoints([{x:32,y:4},{x:36,y:8},{x:32,y:10},{x:26,y:4}], true);    // tip
    g.fillRect(7, 21, 12, 4);                                              // guard (rotated feel)
    g.fillPoints([{x:6,y:20},{x:14,y:28},{x:11,y:31},{x:3,y:23}], true);
    g.fillPoints([{x:4,y:30},{x:8,y:34},{x:4,y:38},{x:0,y:34}], true);     // pommel
  });
  IC('ic_bolt', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:24,y:2},{x:10,y:22},{x:18,y:22},{x:14,y:38},{x:30,y:16},{x:21,y:16}], true);
  });
  IC('ic_boot', (g) => {                  // winged speed chevrons
    g.fillStyle(0xffffff);
    g.fillPoints([{x:8,y:6},{x:22,y:20},{x:8,y:34},{x:8,y:26},{x:14,y:20},{x:8,y:14}], true);
    g.fillPoints([{x:20,y:6},{x:34,y:20},{x:20,y:34},{x:20,y:26},{x:26,y:20},{x:20,y:14}], true);
  });
  IC('ic_heart', (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(13, 14, 9); g.fillCircle(27, 14, 9);
    g.fillPoints([{x:4.5,y:18},{x:35.5,y:18},{x:20,y:36}], true);
  });
  IC('ic_plus', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(15, 4, 10, 32, 4); g.fillRoundedRect(4, 15, 32, 10, 4);
  });
  IC('ic_magnet', (g) => {
    g.fillStyle(0xffffff);
    g.fillRect(6, 4, 10, 18); g.fillRect(24, 4, 10, 18);
    g.fillRect(6, 14, 28, 10);
    g.fillStyle(0x000000, 0.9);
    g.fillRect(6, 24, 10, 0.1);
    g.fillStyle(0xffffff); g.fillRect(6, 26, 10, 8); g.fillRect(24, 26, 10, 8);
  });
  IC('ic_target', (g) => {
    g.lineStyle(4, 0xffffff); g.strokeCircle(20, 20, 15);
    g.fillStyle(0xffffff); g.fillCircle(20, 20, 5);
    g.fillRect(18, 0, 4, 8); g.fillRect(18, 32, 4, 8);
    g.fillRect(0, 18, 8, 4); g.fillRect(32, 18, 8, 4);
  });
  IC('ic_burst', (g) => {
    g.fillStyle(0xffffff);
    spikes(g, 20, 20, 7, 19, 8);
    g.fillCircle(20, 20, 8);
  });
  IC('ic_coin', (g) => {
    g.fillStyle(0xffffff); g.fillCircle(20, 20, 16);
    g.fillStyle(0x000000, 0.35); g.fillCircle(20, 20, 11);
    g.fillStyle(0xffffff); poly(g, 20, 20, 7, 4);
  });
  IC('ic_gem', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:12,y:6},{x:28,y:6},{x:36,y:16},{x:20,y:36},{x:4,y:16}], true);
    g.fillStyle(0x000000, 0.3);
    g.fillPoints([{x:20,y:36},{x:12,y:16},{x:28,y:16}], true);
  });
  IC('ic_book', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(6, 5, 28, 30, 3);
    g.fillStyle(0x000000, 0.4); g.fillRect(11, 5, 3, 30);
    g.fillStyle(0x000000, 0.4);
    g.fillRect(18, 12, 12, 3); g.fillRect(18, 19, 12, 3); g.fillRect(18, 26, 8, 3);
  });
  IC('ic_wind', (g) => {                  // dash / wind swooshes
    g.fillStyle(0xffffff);
    g.fillRoundedRect(2, 8, 26, 5, 2.5); g.fillCircle(30, 10.5, 2.5);
    g.fillRoundedRect(8, 18, 30, 5, 2.5); g.fillCircle(6, 20.5, 2.5);
    g.fillRoundedRect(2, 28, 22, 5, 2.5); g.fillCircle(26, 30.5, 2.5);
  });
  IC('ic_fork', (g) => {                  // triple projectile arrows
    g.fillStyle(0xffffff);
    const arrow = (x1, y1, x2, y2) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      g.lineStyle(4, 0xffffff); g.lineBetween(x1, y1, x2, y2);
      g.fillPoints([
        { x: x2 + Math.cos(a) * 7, y: y2 + Math.sin(a) * 7 },
        { x: x2 + Math.cos(a + 2.5) * 6, y: y2 + Math.sin(a + 2.5) * 6 },
        { x: x2 + Math.cos(a - 2.5) * 6, y: y2 + Math.sin(a - 2.5) * 6 }
      ], true);
    };
    arrow(6, 34, 20, 8); arrow(6, 34, 32, 14); arrow(6, 34, 34, 28);
  });
  IC('ic_ring', (g) => {
    g.lineStyle(5, 0xffffff); g.strokeCircle(20, 20, 14);
    g.fillStyle(0xffffff);
    poly(g, 20, 6, 4, 4); poly(g, 34, 20, 4, 4); poly(g, 20, 34, 4, 4); poly(g, 6, 20, 4, 4);
  });
  IC('ic_flame', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:20,y:2},{x:30,y:14},{x:33,y:24},{x:28,y:34},{x:20,y:38},{x:12,y:34},{x:7,y:24},{x:12,y:12}], true);
    g.fillStyle(0x000000, 0.35);
    g.fillPoints([{x:20,y:16},{x:26,y:26},{x:20,y:34},{x:14,y:26}], true);
  });
  IC('ic_paw', (g) => {
    g.fillStyle(0xffffff);
    g.fillEllipse(20, 26, 16, 13);
    g.fillCircle(8, 16, 4.5); g.fillCircle(16, 10, 4.5); g.fillCircle(24, 10, 4.5); g.fillCircle(32, 16, 4.5);
  });
  IC('ic_bag', (g) => {                   // shop bag
    g.fillStyle(0xffffff);
    g.fillRoundedRect(6, 12, 28, 24, 5);
    g.lineStyle(4, 0xffffff); g.beginPath(); g.arc(20, 13, 8, Math.PI, 0); g.strokePath();
    g.fillStyle(0x000000, 0.35); g.fillCircle(13, 18, 2.4); g.fillCircle(27, 18, 2.4);
  });
  IC('ic_scroll', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(8, 4, 24, 32, 4);
    g.fillStyle(0x000000, 0.4);
    g.fillRect(13, 11, 14, 3); g.fillRect(13, 18, 14, 3); g.fillRect(13, 25, 9, 3);
    g.fillStyle(0xffffff); g.fillCircle(8, 8, 4); g.fillCircle(8, 32, 4);
  });
  IC('ic_trophy', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(11, 4, 18, 16, { tl: 3, tr: 3, bl: 9, br: 9 });
    g.lineStyle(3.5, 0xffffff);
    g.beginPath(); g.arc(9, 9, 5, Math.PI * 0.5, Math.PI * 1.6); g.strokePath();
    g.beginPath(); g.arc(31, 9, 5, Math.PI * 1.4, Math.PI * 0.5); g.strokePath();
    g.fillRect(17, 20, 6, 6);
    g.fillRoundedRect(10, 27, 20, 5, 2); g.fillRoundedRect(13, 25, 14, 4, 2);
  });
  IC('ic_gear', (g) => {
    g.fillStyle(0xffffff);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillRoundedRect(20 + Math.cos(a) * 13 - 3.5, 20 + Math.sin(a) * 13 - 3.5, 7, 7, 2);
    }
    g.fillCircle(20, 20, 12);
    g.fillStyle(0x000000, 0.9); g.fillCircle(20, 20, 5);
  });
  IC('ic_play', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:10,y:5},{x:34,y:20},{x:10,y:35}], true);
  });
  IC('ic_pause', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(8, 6, 9, 28, 3); g.fillRoundedRect(23, 6, 9, 28, 3);
  });
  IC('ic_x', (g) => {
    g.fillStyle(0xffffff);
    const bar = (rot) => {
      g.save(); g.translateCanvas(20, 20); g.rotateCanvas(rot);
      g.fillRoundedRect(-16, -4.5, 32, 9, 4); g.restore();
    };
    bar(Math.PI / 4); bar(-Math.PI / 4);
  });
  IC('ic_home', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:20,y:4},{x:37,y:19},{x:31,y:19},{x:31,y:36},{x:9,y:36},{x:9,y:19},{x:3,y:19}], true);
    g.fillStyle(0x000000, 0.4); g.fillRect(16, 24, 8, 12);
  });
  IC('ic_skull', (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(20, 17, 14);
    g.fillRoundedRect(12, 24, 16, 12, 3);
    g.fillStyle(0x000000, 0.85);
    g.fillCircle(14.5, 16, 4.2); g.fillCircle(25.5, 16, 4.2);
    g.fillTriangle(20, 21, 17, 26, 23, 26);
    g.fillRect(15, 30, 2.5, 6); g.fillRect(19, 30, 2.5, 6); g.fillRect(23, 30, 2.5, 6);
  });
  IC('ic_shield', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:20,y:3},{x:35,y:9},{x:35,y:20},{x:31,y:30},{x:20,y:37},{x:9,y:30},{x:5,y:20},{x:5,y:9}], true);
    g.fillStyle(0x000000, 0.35);
    g.fillPoints([{x:20,y:8},{x:30,y:12},{x:30,y:20},{x:20,y:31},{x:20,y:8}], true);
  });
  IC('ic_clock', (g) => {
    g.lineStyle(4, 0xffffff); g.strokeCircle(20, 20, 15);
    g.fillStyle(0xffffff);
    g.fillRoundedRect(18.5, 10, 3, 11, 1.5);
    g.fillRoundedRect(19, 19, 9, 3, 1.5);
  });
  IC('ic_arrowup', (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{x:20,y:3},{x:35,y:19},{x:26,y:19},{x:26,y:37},{x:14,y:37},{x:14,y:19},{x:5,y:19}], true);
  });
  IC('ic_star', (g) => {
    g.fillStyle(0xffffff);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 17 : 7.5;
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      pts.push({ x: 20 + Math.cos(a) * r, y: 20 + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
  });
  IC('ic_lock', (g) => {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(8, 17, 24, 18, 4);
    g.lineStyle(4.5, 0xffffff);
    g.beginPath(); g.arc(20, 15, 7.5, Math.PI, 0); g.strokePath();
    g.fillStyle(0x000000, 0.85); g.fillCircle(20, 24, 3); g.fillRect(18.6, 25, 2.8, 5);
  });
  IC('ic_thorn', (g) => {
    g.fillStyle(0xffffff);
    spikes(g, 20, 20, 8, 19, 6);
    g.lineStyle(4, 0xffffff); g.strokeCircle(20, 20, 9);
  });

  g.destroy();
};

// ============================================================================
// UI FACTORIES — modern flat design: soft depth, rounded corners, icons
// ============================================================================

// Glass panel with header strip
SS.makePanel = function (scene, x, y, w, h, color = 0x121a2c, alpha = 0.97) {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 18);        // drop shadow
  g.fillStyle(color, alpha);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  g.fillStyle(0xffffff, 0.03);
  g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.4, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.lineStyle(1.5, 0x33456b, 0.9);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  return g;
};

// Modern button: flat fill + darker bottom edge, optional icon, press anim
SS.makeButton = function (scene, x, y, w, h, label, color, onClick, fontSize = 20, icon = null) {
  const c = scene.add.container(x, y);
  const dark = Phaser.Display.Color.ValueToColor(color).darken(28).color;
  const bg = scene.add.graphics();
  bg.fillStyle(dark, 1);
  bg.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, Math.min(14, h / 2.6)); // bottom edge
  bg.fillStyle(color, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h - 3, Math.min(14, h / 2.6));
  bg.fillStyle(0xffffff, 0.10);
  bg.fillRoundedRect(-w / 2, -h / 2, w, (h - 3) / 2, { tl: Math.min(14, h / 2.6), tr: Math.min(14, h / 2.6), bl: 0, br: 0 });
  c.add(bg);

  let textX = 0;
  if (icon) {
    const iconSize = Math.min(h * 0.52, 26);
    const iconImg = scene.add.image(0, -1, icon).setDisplaySize(iconSize, iconSize);
    const tmp = scene.add.text(0, 0, label, { fontFamily: 'Arial Black, Arial', fontSize: fontSize + 'px' }).setVisible(false);
    const total = iconSize + 8 + tmp.width;
    tmp.destroy();
    iconImg.setX(-total / 2 + iconSize / 2);
    textX = -total / 2 + iconSize + 8;
    c.add(iconImg);
    c.iconImg = iconImg;
  }
  const txt = scene.add.text(textX, -1, label, {
    fontFamily: 'Arial Black, Arial', fontSize: fontSize + 'px', color: '#ffffff'
  }).setOrigin(icon ? 0 : 0.5, 0.5).setShadow(0, 2, '#00000066', 2);
  c.add(txt);

  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.05, duration: 90 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
  c.on('pointerdown', () => {
    SS.Audio.unlock(); SS.Audio.play('ui');
    scene.tweens.add({ targets: c, scale: 0.93, duration: 55, yoyo: true, onComplete: () => onClick && onClick() });
  });
  c.labelText = txt;
  return c;
};

// Circular icon button (nav dock, close buttons)
SS.makeIconButton = function (scene, x, y, r, icon, color, onClick, label = null) {
  const c = scene.add.container(x, y);
  const dark = Phaser.Display.Color.ValueToColor(color).darken(28).color;
  const g = scene.add.graphics();
  g.fillStyle(dark, 1); g.fillCircle(0, 3, r);
  g.fillStyle(color, 1); g.fillCircle(0, 0, r);
  g.fillStyle(0xffffff, 0.10); g.fillEllipse(0, -r * 0.35, r * 1.5, r * 0.9);
  const img = scene.add.image(0, 0, icon).setDisplaySize(r * 1.05, r * 1.05);
  c.add([g, img]);
  if (label) {
    c.add(scene.add.text(0, r + 12, label, {
      fontFamily: 'Arial', fontSize: '11px', color: '#8fa2c8'
    }).setOrigin(0.5));
  }
  c.setSize(r * 2.2, r * 2.2);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.1, duration: 90 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
  c.on('pointerdown', () => {
    SS.Audio.unlock(); SS.Audio.play('ui');
    scene.tweens.add({ targets: c, scale: 0.9, duration: 55, yoyo: true, onComplete: () => onClick && onClick() });
  });
  return c;
};

// Currency pill: rounded chip with icon + amount
SS.makePill = function (scene, x, y, icon, tint, initial = '') {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x0d1425, 0.9);
  g.fillRoundedRect(0, -15, 96, 30, 15);
  g.lineStyle(1.5, 0x2b3c5f, 1);
  g.strokeRoundedRect(0, -15, 96, 30, 15);
  const img = scene.add.image(17, 0, icon).setDisplaySize(19, 19).setTint(tint);
  const txt = scene.add.text(32, 0, initial, {
    fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff'
  }).setOrigin(0, 0.5);
  c.add([g, img, txt]);
  c.valueText = txt;
  return c;
};
