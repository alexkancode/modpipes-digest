// Assets: sprite loader (asset-plan.json names), code-drawn stand-ins for missing art, palette, sfx bridge.
// Every lookup returns an entry {img, fw, fh, frames, white, tints, pink, ph}; a missing PNG gets a
// code-drawn stand-in with the same strip size and frame order, so nothing on screen depends on the art arriving.
var Assets = (function () {
  // ---- palette (art direction §2), overridden by the plan's palette ----
  var pal = {
    bg_far: '#0E1719', bg_mid: '#1C2A2A', ground: '#33291F', ground_rim: '#A08C66', ink: '#0A0809',
    hero_rim: '#BDE6EE', hero_skin: '#F0C8A8', hero_hat: '#3A2A30', suit_a: '#E8E4DA', suit_b: '#2B3F6B',
    barrel: '#9A6234', barrel_band: '#5A3A22', fire: '#F0552E', cold: '#58C6F2', lightning: '#F2D640',
    phys: '#D8D0C0', foe: '#9C7BE8', foe_dark: '#3E2A6A', foe_eye: '#F4F7B0', telegraph: '#FF8A3D',
    loot_core: '#FFF4D6', loot_chaos: '#E6E2D8', loot_tailor: '#FF5FA2', loot_vaal: '#E8423A',
    loot_exalt: '#A8D8FF', loot_divine: '#F2C14E', censor: '#FF5FA2', censor_text: '#2A0E1E', charm: '#FF5FA2',
    acid: '#B6D84A', hp: '#E0384F', composure: '#E06AC0', panel: '#15191B', banner_red: '#4A1018',
    text: '#F3EAD8', text_dim: '#A8A090', unique: '#E8913A',
    accent_l1: '#2E5E5C', accent_l2: '#7A4630', accent_l3: '#5A5034', accent_l4: '#6E3448', accent_l5: '#6A2430'
  };
  var plan = window.ASSET_PLAN || null;
  if (plan && plan.palette) for (var pk in plan.palette) pal[pk] = plan.palette[pk];
  pal.loot = pal.loot_core;

  // Strip sizes mirror asset-plan.json, so stand-ins keep the same frame layout when the plan file is absent.
  var SPECS = 'hero_body 48 64 44|hero_leggings 48 64 44|hero_tunic 48 64 44|hero_cloak 48 64 44|hero_barrel 48 64 44|hero_hat 48 64 44|hero_tabula 48 64 1|grunt 40 48 16|caster 40 48 16|elite 56 56 17|foe_hats 24 16 15|boss_hillock 128 128 16|boss_brutus 128 128 19|boss_dominus 112 128 16|boss_piety 64 80 14|boss_heart 128 128 10|boss_kitava 160 160 24|proj_spark 16 10 4|proj_bolt 12 12 2|proj_kiss 14 12 2|proj_censor 32 12 2|proj_barbell 32 16 4|proj_flask 12 14 4|proj_shockwave 32 24 3|hz_plate 32 24 4|hz_acid 32 16 4|hz_fire_puddle 32 12 3|hz_tell_ground 32 8 2|hz_pillar 24 112 3|checkpoint 24 56 2|gate 24 96 3|orbs 16 16 6|pickup_tea 14 14 2|pickup_flask 12 16 1|prop_sign_dresscode 32 40 1|prop_chest_tabula 32 24 2|npc_merveil_shell 24 16 2|npc_bestel 32 48 2|prop_signup 24 32 1|prop_protein 16 16 2|prop_tally 32 32 1|prop_window 48 64 1|prop_booth 48 64 2|npc_einhar 40 48 2|npc_pigeon 16 12 2|prop_vanity 48 48 4|prop_menu 32 40 1|prop_wetfloor 16 24 1|prop_reservation 24 16 2|prop_tipjar 16 20 2|prop_dessert 40 32 2|tiles_l1 16 16 12|bg_l1_far 640 360 1|bg_l1_mid 640 360 1|tiles_l2 16 16 12|bg_l2_far 640 360 1|bg_l2_mid 640 360 1|tiles_l3 16 16 12|bg_l3_far 640 360 1|bg_l3_mid 640 360 1|tiles_l4 16 16 12|bg_l4_far 640 360 1|bg_l4_mid 640 360 1|tiles_l5 16 16 12|bg_l5_far 640 360 1|bg_l5_mid 640 360 1|bg_hideout 640 360 1|ui_globe 48 48 4|ui_globe_icon 10 10 2|ui_pips 12 12 10|ui_flask 8 14 2|ui_bossbar 260 14 1|ui_panel 24 24 1|ui_bubble 24 24 1|ui_bubble_tail 8 8 1|ui_heart_tell 12 12 2|ui_alert 12 16 2|ui_mash 24 24 4|ui_reticle 16 16 2|icon_currency 12 12 6|icon_portal 10 14 2|ui_card 176 104 2|ui_button 96 20 2|ui_weapon 32 32 3|ui_stamp 64 24 2|ui_upvote 10 10 2|ui_modshield 16 16 1|ui_touch 56 56 7|ui_pause 24 24 1|ui_logo 320 80 1|cut_door 96 128 3|cut_pair 112 96 2|fx_hit 16 16 4|fx_spark_hit 12 12 3|fx_heart 8 8 2|fx_sparkle 8 8 4|fx_dust 16 8 4|fx_layer 24 24 3|fx_sweat 6 8 2|fx_chomp 24 16 3';
  var specs = {};
  SPECS.split('|').forEach(function (s) { var a = s.split(' '); specs[a[0]] = { file: a[0] + '.png', w: +a[1], h: +a[2], frames: +a[3] }; });
  if (plan && plan.sprites) plan.sprites.forEach(function (s) { specs[s.name] = { file: s.file, w: s.w, h: s.h, frames: s.frames || 1 }; });

  // Code key -> plan name when they differ. Code is written against plan names, so this starts empty.
  var ALIAS = {};
  // Logic cue keys (tech plan §6.3) -> plan sfx names. Keys the plan already has pass through unchanged.
  var SFX_ALIAS = {
    crit: 'hit_heavy', spark: 'spark_cast', pickup_orb: 'pickup_chaos', pickup_exalt: 'pickup_exalted',
    loot_beam: 'loot_drop', squeak: 'censor_squeak', boss_beam: 'divine_ding', boss_hit: 'hit_heavy',
    record_scratch: 'swoon', trombone: 'vaal_brick'
  };
  if (plan && plan.sfx) plan.sfx.forEach(function (s) { delete SFX_ALIAS[s.name]; });

  var CHAR = /^(hero_|grunt$|caster$|elite$|boss_)/;     // gets a white hit-flash silhouette
  var PINK = /^(hero_body$|grunt$|caster$|elite$|boss_)/;  // gets a pink Charm-tell copy
  var FOE = /^(grunt|caster|elite)$/;                      // gets 5 per-level cool tints
  var LEVEL_TINT = ['#FFFFFF', '#E6E6FF', '#F2EEFF', '#E4ECFF', '#E2DCFF'];

  var entries = {}, warned = {}, api;

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function tinted(src, color, op, alpha) {
    var c = canvas(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = op; x.globalAlpha = alpha; x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    if (op === 'multiply') { x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); }
    return c;
  }

  function makeEntry(name, img, spec, ph) {
    var frames = spec.frames || 1;
    var e = { img: img, fw: Math.floor(img.width / frames), fh: img.height, frames: frames, white: null, tints: null, pink: null, ph: ph };
    if (CHAR.test(name)) e.white = tinted(img, '#FFFFFF', 'source-in', 1);
    if (PINK.test(name)) e.pink = tinted(img, pal.charm, 'source-atop', 0.4);
    if (FOE.test(name)) { e.tints = []; for (var i = 0; i < 5; i++) e.tints.push(i ? tinted(img, LEVEL_TINT[i], 'multiply', 1) : img); }
    return e;
  }

  function sprite(key) {
    var name = ALIAS[key] || key, e = entries[name];
    if (e) return e;
    var spec = specs[name] || { w: 16, h: 16, frames: 1 };
    if (!warned[name]) { warned[name] = 1; if (api.ready) console.warn('placeholder', name); }
    return (entries[name] = makeEntry(name, Stand.paint(name, spec), spec, true));
  }

  function load(done) {
    var names = Object.keys(specs), left = names.length, finished = false;
    function settle() { if (--left === 0) finish(); }
    function finish() { if (finished) return; finished = true; api.ready = true; done && done(); }
    names.forEach(function (name) {
      var img = new Image();
      img.src = 'assets/' + specs[name].file;
      var ok = function () { entries[name] = makeEntry(name, img, specs[name], false); settle(); };
      if (img.decode) img.decode().then(ok, settle); else { img.onload = ok; img.onerror = settle; }
    });
    setTimeout(finish, 3000);
  }

  function names() { return Object.keys(specs); }

  // ======================================================================================
  // Stand: code-drawn stand-ins. Each painter draws one frame into a context already
  // translated to that frame's top-left; outline and hero halo are added afterwards.
  // ======================================================================================
  var Stand = (function () {
    var c; // current frame context
    function col(r) { return pal[r] || r; }
    function R(x, y, w, h, r) { c.fillStyle = col(r); c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
    function disc(cx, cy, r, role) { for (var y = -r; y <= r; y++) { var hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); R(cx - hw, cy + y, hw * 2 + 1, 1, role); } }
    function ring(cx, cy, r, t, role) { for (var y = -r; y <= r; y++) { var o = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); var ir = r - t, ii = Math.abs(y) <= ir ? Math.floor(Math.sqrt(ir * ir - y * y + ir * 0.8)) : -1; if (ii < 0) R(cx - o, cy + y, o * 2 + 1, 1, role); else { R(cx - o, cy + y, o - ii, 1, role); R(cx + ii + 1, cy + y, o - ii, 1, role); } } }
    function heart(cx, cy, s, role) { disc(cx - s, cy, s, role); disc(cx + s, cy, s, role); for (var y = 0; y <= s * 2 + 1; y++) R(cx - s * 2 + y, cy + y, Math.max(1, (s * 2 - y) * 2 + 1), 1, role); }
    // rows-based triangle/trapezoid: width goes w0 -> w1 from y0 to y1, centred on cx
    function trap(cx, y0, y1, w0, w1, role) { for (var y = y0; y <= y1; y++) { var w = w0 + (w1 - w0) * (y - y0) / Math.max(1, y1 - y0); R(cx - w / 2, y, w, 1, role); } }
    function text(str, x, y, role, s, align) { Font.draw(c, str, x, y, s || 1, role || 'text', align === undefined ? 1 : align); }
    function zig(x, y, w, h, role) { for (var i = 0; i < w; i++) R(x + i, y + ((i >> 1) % 2 ? h - 1 : 0) - ((i >> 2) % 2), 1, 2, role); }
    function hatch(x, y, w, h, off, role) { for (var i = -h; i < w; i += 4) for (var k = 0; k < h; k++) { var px = i + k + off; if (px >= 0 && px < w) R(x + px, y + h - 1 - k, 1, 1, role); } }

    // ---- hero rig: one pose object shared by body and every overlay ----
    var P = { bob: 0, lx: 0, rx: 0, lift: 0, arm: 0, mode: 0, lean: 0, blush: 0, scroll: 0, glow: 0 };
    function pose(i) {
      P.bob = 0; P.lx = 0; P.rx = 0; P.lift = 0; P.arm = 0; P.mode = 0; P.lean = 0; P.blush = 0; P.scroll = 0; P.glow = 0;
      if (i <= 3) P.bob = i > 1 ? 1 : 0;
      else if (i <= 9) { var k = i - 4; P.lx = [-3, -1, 2, 3, 1, -2][k]; P.rx = -P.lx; P.bob = k % 3 === 1 ? 1 : 0; P.arm = 4; }
      else if (i <= 11) { P.lift = 5; P.arm = 2; }
      else if (i <= 13) { P.lx = -3; P.rx = 3; P.arm = 2; }
      else if (i <= 23) { P.arm = (i === 15 || i === 18 || i === 22 || i === 23) ? 1 : 3; P.lx = -1; P.rx = 2; }
      else if (i <= 26) { P.arm = i === 25 ? 1 : i === 24 ? 3 : 0; P.glow = i === 25 ? 1 : 0; }
      else if (i <= 31) P.mode = (i === 27 || i === 31) ? 3 : 1;
      else if (i === 32) P.lean = -2;
      else if (i <= 34) { P.blush = 1; P.arm = 5; P.bob = i - 33; }
      else if (i <= 36) { P.lean = i === 35 ? 1 : -1; P.arm = 5; P.blush = 1; }
      else if (i === 37) P.lean = -3;
      else if (i === 38) P.mode = 3;
      else if (i <= 40) P.mode = 2;
      else P.scroll = 1;
      return P;
    }
    // A body part in standing space (feet at 24,63). Lying (mode 2) maps it onto the floor; crouch/ball squash it.
    function part(x, y, w, h, role) {
      var top = y < 46 ? P.bob : 0, sx = y < 46 ? P.lean : 0;
      if (P.mode === 2) { R(2 + (63 - (y + h)) * 0.7, 51 + (x - 15) * 0.55, h * 0.7, w * 0.55, role); return; }
      if (P.mode === 1) { R(24 + (x - 24) * 0.9, 44 + (y - 2) * 0.32, w * 0.9, Math.max(1, h * 0.32), role); return; }
      if (P.mode === 3) { R(x, 20 + y * 0.68, w, h * 0.68, role); return; }
      R(x + sx, y + top, w, h, role);
    }
    function legs(role, from, boot) {
      var L = 63 - P.lift;
      part(19 + P.lx, from, 4, L - from - (boot ? 4 : 0), role); part(25 + P.rx, from, 4, L - from - (boot ? 4 : 0), role);
      if (boot) { part(18 + P.lx, L - 4, 5, 4, boot); part(25 + P.rx, L - 4, 5, 4, boot); }
    }
    function arms(role, len) {
      len = len || 13;
      part(16, 31, 3, len, role); // back arm
      if (P.arm === 1) part(30, 32, 12, 3, role);
      else if (P.arm === 2 || P.arm === 5) part(30, 22, 3, 11, role);
      else if (P.arm === 3) part(27, 30, 3, 9, role);
      else part(30, 31 + (P.arm === 4 ? (P.lx > 0 ? 1 : -1) : 0), 3, len, role);
    }
    function heroBody(i) {
      pose(i);
      legs('hero_skin', 46, '#4A3428');
      for (var y = 30; y < 47; y += 2) part(18, y, 12, 1, 'suit_a'), part(18, y + 1, 12, 1, 'suit_b');
      part(18, 44, 5, 3, 'suit_b'); part(25, 44, 5, 3, 'suit_b');
      arms('hero_skin');
      if (P.arm === 1) part(41, 29, 2, 8, '#6A4A2A'), part(41, 28, 2, 2, 'hero_rim');
      if (P.glow) part(42, 30, 4, 4, 'hero_rim');
      if (P.scroll) part(29, 33, 9, 7, 'suit_a');
      part(18, 15, 12, 15, 'hero_skin');               // head
      part(17, 15, 3, 12, '#2A1E22'); part(18, 15, 12, 3, '#2A1E22');
      part(25, 21, 2, 3, 'ink'); part(21, 21, 2, 3, 'ink');
      if (P.blush) { part(20, 25, 3, 1, 'charm'); part(26, 25, 3, 1, 'charm'); }
      part(14, 13, 20, 3, 'hero_hat');
      for (var k = 0; k < 9; k++) part(19 + k * 0.4, 12 - k, 10 - k, 1, 'hero_hat');
      part(26, 3, 4, 2, 'hero_hat');
    }
    function heroLeggings(i) { pose(i); legs('lightning', 43); part(18, 43, 12, 4, 'lightning'); part(20 + P.lx, 50, 1, 8, '#B89A10'); part(26 + P.rx, 52, 1, 6, '#B89A10'); }
    function heroTunic(i) { pose(i); part(17, 29, 14, 22, 'cold'); arms('cold', 10); part(17, 49, 14, 2, '#E8F6FF'); }
    function heroCloak(i) {
      pose(i); var lag = (i >= 4 && i <= 9) ? -2 : 0;
      part(12 + lag, 28, 8, 18, 'fire'); part(15, 28, 18, 4, 'fire');
      for (var k = 0; k < 4; k++) part(12 + lag + k * 2, 46, 1, 2 + (k % 2) * 2, 'telegraph');
    }
    function heroBarrel(i) {
      pose(i);
      part(14, 30, 20, 22, 'barrel'); part(14, 33, 20, 2, 'barrel_band'); part(14, 47, 20, 2, 'barrel_band');
      for (var k = 0; k < 4; k++) part(17 + k * 5, 30, 1, 22, 'barrel_band');
      part(19, 26, 2, 5, '#C8A060'); part(27, 26, 2, 5, '#C8A060');
    }
    function heroHat(i) { pose(i); part(14, 13, 20, 3, 'loot_divine'); for (var k = 0; k < 14; k++) part(18 + k * 0.3, 12 - k * 0.8, 12 - k * 0.7, 1, 'loot_divine'); part(32, 14, 5, 4, 'suit_a'); }
    function heroTabula() { P.mode = 0; P.bob = 0; P.lean = 0; part(13, 26, 22, 34, '#E6E2D8'); for (var k = 0; k < 6; k++) R(16 + (k % 3) * 6, 34 + (k >> 1 & 1) * 8 + (k > 3 ? 8 : 0), 2, 2, '#9A9488'); R(30, 50, 6, 4, 'suit_a'); }

    // ---- foes ----
    function face(cx, y, wink, role) { R(cx - 4, y, 2, 2, role || 'foe_eye'); if (wink) R(cx + 2, y + 1, 3, 1, 'ink'); else R(cx + 2, y, 2, 2, role || 'foe_eye'); }
    function grunt(i) {
      if (i >= 11 && i <= 13) { var h = 30 - (i - 11) * 10; trap(20, 47 - h, 47, 20, 30, 'foe'); trap(20, 47 - h, 47 - h + 4, 18, 20, 'foe_dark'); return; }
      var b = (i === 1 || i === 3) ? 1 : 0, lean = i === 10 ? -3 : (i === 8 || i === 9) ? 3 : 0;
      var st = i >= 2 && i <= 5 ? (i % 2 ? 2 : -2) : 0;
      R(13 + st, 38, 5, 9, 'foe_dark'); R(22 - st, 38, 5, 9, 'foe_dark');
      trap(20 + lean, 10 + b, 39, 34, 10, 'foe'); trap(20 + lean, 10 + b, 14 + b, 34, 30, 'foe_dark');
      R(3 + lean, 8 + b, 4, 4, 'foe_dark'); R(33 + lean, 8 + b, 4, 4, 'foe_dark');
      R(14 + lean, 4 + b, 12, 9, 'foe'); face(20 + lean, 7 + b, i >= 14); R(15 + lean, 12 + b, 10, 1, 'ink');
      if (i === 6 || i === 7) R(30, 0 + b, 4, 12, 'foe'); else if (i === 8 || i === 9) R(30 + lean, 18, 10, 4, 'foe');
      if (i >= 14) { R(30, 16, 8, 3, 'foe'); R(36, 14, 2, 2, 'foe'); }
    }
    function caster(i) {
      if (i >= 13) { var h = 26 - (i - 13) * 8; trap(20, 46 - h, 46, 26, 30, 'foe'); return; }
      var lean = i === 12 ? -3 : 0;
      trap(20 + lean, 14, 46, 26, 2, 'foe'); trap(20 + lean, 14, 22, 26, 22, 'foe_dark');
      trap(20 + lean, 2, 14, 8, 18, 'foe_dark'); R(15 + lean, 8, 10, 6, 'ink'); face(20 + lean, 9, i === 10 || i === 11);
      if (i === 6 || i === 7) { R(10, 22, 4, 6, 'foe'); R(26, 22, 4, 6, 'foe'); R(16, 22, 8, 6, '#FFFFFF'); }
      else if (i === 8 || i === 9) R(28, 20, 10, 4, 'foe');
      else if (i === 10) R(22, 13, 4, 4, 'foe'); else if (i === 11) R(28, 12, 10, 3, 'foe');
    }
    function elite(i) {
      if (i >= 14) { var h = 34 - (i - 14) * 11; trap(28, 55 - h, 55, 36, 46, 'foe'); trap(28, 55 - h, 59 - h, 30, 36, 'foe_dark'); return; }
      var lean = (i === 8 || i === 9) ? 5 : i === 13 ? -3 : (i === 6 || i === 7) ? 2 : 0, cr = (i === 6 || i === 7) ? 4 : 0;
      var st = i >= 2 && i <= 5 ? (i % 2 ? 2 : -2) : 0;
      R(17 + st, 44, 7, 11, 'foe_dark'); R(32 - st, 44, 7, 11, 'foe_dark');
      trap(28 + lean, 16 + cr, 45, 46, 26, 'foe'); for (var k = 0; k < 3; k++) R(16 + lean + k * 9, 24 + cr + k * 5, 24 - k * 4, 3, 'foe_dark');
      trap(8 + lean, 10 + cr, 18 + cr, 2, 12, 'foe_dark'); trap(48 + lean, 10 + cr, 18 + cr, 2, 12, 'foe_dark');
      R(23 + lean, 6 + cr, 10, 10, 'foe'); face(28 + lean, 9 + cr, i === 10 || i === 11); R(25 + lean, 14 + cr, 6, 1, 'ink');
      if (i === 10 || i === 11) { R(36, 26, 8, 4, 'foe'); R(31, 5, 4, 1, 'ink'); }
    }
    var HAT_COL = ['#2E7E5C', '#C8B48A', '#2B3F6B', '#555555', '#7A4630', '#E8E4DA', '#D8C890', '#E8E4DA', '#F2C14E', '#B07090', '#B6D84A', '#4A2A40', '#1A1A1A', '#C0C0C0', '#2A2020'];
    function foeHat(i) { var a = i % 3; R(4, 10, 16, 6, HAT_COL[i]); if (a === 2) R(7, 3, 10, 8, HAT_COL[i]); else if (a === 1) R(8, 6, 8, 5, HAT_COL[i]); else R(6, 8, 4, 3, HAT_COL[i]); }

    // ---- bosses: one painter each, frames follow the plan's order ----
    function defeatedSquash(fh, i, start) { return i >= start ? Math.min(3, i - start + 1) * Math.floor(fh / 10) : 0; }
    function hillock(i) {
      var d = defeatedSquash(128, i, 13), b = i < 4 ? (i & 1) : 0, hug = i >= 8 && i <= 11, lean = i >= 10 && i <= 11 ? 6 : i === 12 ? -4 : 0;
      R(42, 104, 14, 23, '#7A6A98'); R(72, 104, 14, 23, '#7A6A98');
      trap(64 + lean, 40 + b + d, 108, 44, 64, '#B4A8D0'); R(52 + lean, 22 + b + d, 24, 22, '#B4A8D0');
      face(64 + lean, 30 + b + d, false, 'ink'); R(58 + lean, 38 + b + d, 12, 2, 'ink');
      for (var k = 0; k < 5; k++) R(48 + lean + k * 7, 60 + d + (k % 2) * 3, 4, 1, 'ink');
      heart(64 + lean, 58 + d, 3, 'charm');
      if (hug) { R(4 + lean, 48 + d, 40, 8, '#B4A8D0'); R(84 + lean, 48 + d, 40, 8, '#B4A8D0'); if (i >= 10) R(60 + lean, 39 + d, 8, 4, 'charm'); }
      else { R(28, 50 + d, 10, 34, '#B4A8D0'); R(92, 50 + d, 10, (i >= 4 && i <= 5) ? 10 : 34, '#B4A8D0');
        if (i === 4 || i === 5) R(92, 10, 12, 44, '#6A4A2A'); else if (i === 6 || i === 7) R(100, 70, 26, 12, '#6A4A2A'); else R(96, 76, 10, 40, '#6A4A2A'); }
    }
    function brutus(i) {
      var d = defeatedSquash(128, i, 16), b = i < 4 ? (i & 1) * 2 : 0, flex = i >= 4 && i <= 6;
      R(52, 108, 9, 19, '#7E6AB8'); R(67, 108, 9, 19, '#7E6AB8'); R(48, 98 + d, 32, 12, '#2B2B3A');
      trap(64, 34 + b + d, 100, 92, 30, '#9C86D8'); R(32, 40 + b + d, 64, 22, '#E8E4DA');
      R(54, 14 + b + d, 20, 20, '#9C86D8'); R(54, 18 + b + d, 20, 3, 'fire'); face(64, 24 + b + d, false, 'ink');
      for (var k = 0; k < 6; k++) R(40 + k * 9, 64 + d, 5, 3, '#C0C0C0');
      if (flex) { R(10, 14 + d, 14, 34, '#9C86D8'); R(104, 14 + d, 14, 34, '#9C86D8'); R(8, 10 + d, 18, 12, '#9C86D8'); R(102, 10 + d, 18, 12, '#9C86D8'); }
      else if (i >= 9 && i <= 12) { R(20, 4, 88, 6, '#888'); R(16, 0, 8, 14, '#444'); R(104, 0, 8, 14, '#444'); R(24, 10, 12, 30, '#9C86D8'); R(92, 10, 12, 30, '#9C86D8'); }
      else if (i === 13 || i === 14) { R(70, 24, 20, 10, '#9C86D8'); R(86, 18, 3, 3, 'cold'); }
      else { R(18, 42 + b + d, 14, 40, '#9C86D8'); R(96, 42 + b + d, 14, 40, '#9C86D8'); }
    }
    function dominus(i) {
      var d = defeatedSquash(128, i, 13), b = i < 4 ? (i & 1) * 2 : 0, f = i >= 9 && i <= 11;
      trap(56, 30 + b + d, 120, 26, 56, '#E8E4DA'); R(54, 30 + b + d, 4, 90 - b - d, 'loot_divine');
      R(44, 28 + b + d, 24, 6, 'loot_divine'); R(46, 6 + b + d, 20, 22, 'hero_skin'); R(44, 2 + b + d, 24, 6, '#E8E4DA');
      face(56, 14 + b + d, false, 'ink'); R(52, 22 + b + d, 8, 3, 'ink');
      if (f) { R(34, 44 + d, 44, 8, '#E8E4DA'); R(34, 44 + d, 44, 1, 'loot_divine'); }
      else if (i >= 4 && i <= 6) { R(70, 26, 30, 6, '#E8E4DA'); R(98, 18, 10, 6, 'censor'); }
      else if (i === 7 || i === 8) { R(72, 50, 6, 40, '#E8E4DA'); }
      else { R(28, 50 + b + d, 8, 34, '#E8E4DA'); R(78, 50 + b + d, 8, 30, '#E8E4DA'); R(80, 74 + b + d, 14, 18, '#6A4A2A'); }
    }
    function piety(i) {
      var d = defeatedSquash(80, i, 11), b = i < 4 ? (i & 1) : 0;
      R(24, 66, 6, 13, '#3A2A30'); R(34, 66, 6, 13, '#3A2A30');
      trap(32, 24 + b + d, 68, 16, 30, '#E8E4DA'); R(28, 24 + b + d, 8, 20, '#6A2430');
      R(26, 8 + b + d, 12, 15, 'hero_skin'); R(24, 4 + b + d, 16, 6, '#8A3A2A'); R(26, 8 + b + d, 12, 3, '#C0A040');
      face(32, 14 + b + d, i === 8 || i === 9, 'ink');
      if (i >= 4 && i <= 7) { R(40, i < 6 ? 14 : 28, 4, 14, '#E8E4DA'); disc(44, i < 6 ? 12 : 26, 3, 'fire'); }
      else { R(18, 28 + d, 4, 22, '#E8E4DA'); R(42, 28 + d, 4, 22, '#E8E4DA'); }
      R(14, 46 + d, 8, 10, '#6A4A2A');
    }
    function bheart(i) {
      var d = i >= 7 ? (i - 6) * 18 : 0, s = (i === 4 || i === 5) ? 26 : (i === 1 || i === 2) ? 23 : 22;
      R(30, 0, 3, 40 + d, '#8A3A4A'); R(95, 0, 3, 40 + d, '#8A3A4A');
      heart(64, 52 + d, s, '#D04A6A'); heart(64, 50 + d, s - 4, '#E8607E');
      disc(64, 62 + d, 10, '#FFFFFF'); disc(64, 63 + d, 5, 'ink'); R(62, 60 + d, 2, 2, '#FFFFFF');
      R(36, 74 + d, 8, 3, 'charm'); R(84, 74 + d, 8, 3, 'charm');
      if (i === 4 || i === 5) for (var k = 0; k < 6; k++) R(30 + k * 12, 40 + d + (k % 2) * 30, 2, 8, 'telegraph');
    }
    function kitava(i) {
      var d = defeatedSquash(160, i, 21), b = i < 4 ? (i & 1) * 2 : 0;
      var lean = (i === 6 || i === 7) ? 8 : i === 20 ? -6 : 0, puff = i === 12 || i === 13;
      R(56, 130, 18, 29, '#4A3F55'); R(88, 130, 18, 29, '#4A3F55');
      trap(80 + lean, 50 + b + d, 134, 70, 96, '#5A4E68'); for (var k = 0; k < 5; k++) R(54 + k * 12 + lean, 70 + d + (k % 3) * 18, 2, 10, k % 2 ? 'telegraph' : '#A0522D');
      R(56 + lean, 18 + b + d, 48, 34, '#5A4E68'); R(48 + lean, 4 + d, 8, 18, '#2A2430'); R(104 + lean, 4 + d, 8, 18, '#2A2430');
      face(80 + lean, 28 + b + d, false, 'telegraph');
      R(64 + lean, 40 + b + d, 32, (i === 10 || i === 11 || i === 14 || i === 15) ? 10 : 4, 'ink');
      if (puff) { disc(58 + lean, 42 + d, 6, '#6A5E78'); disc(102 + lean, 42 + d, 6, '#6A5E78'); }
      trap(80 + lean, 52 + d, 80 + d, 30, 2, '#F3EAD8');
      if (i === 4 || i === 5) R(124, 4, 6, 70, '#C0C0C0'); else R(128, 60 + d, 6, 60, '#C0C0C0');
      for (var t = 0; t < 3; t++) R(124 + t * 4, (i === 4 || i === 5) ? 0 : 56 + d, 2, 6, '#C0C0C0');
      R(24, 70 + d, 6, 40, '#C0C0C0');
      if (i >= 16 && i <= 18) R(70 + lean, 38 + d, 20, 10, ['fire', 'cold', 'lightning'][i - 16]);
    }

    // ---- small things ----
    var ORB = ['loot_chaos', 'loot_tailor', 'loot_vaal', 'loot_exalt', 'loot_divine', '#C8CCD4'];
    function orb(i, s) {
      var r = (s >> 1) - 2, cx = s >> 1, cy = s >> 1;
      if (i === 5) { disc(cx, cy - 2, r - 1, '#C8CCD4'); disc(cx, cy - 2, r - 3, '#E8F0FF'); R(cx - 1, cy + r - 3, 3, 4, '#8A8A9A'); return; }
      disc(cx, cy, r, ORB[i]); R(cx - 2, cy - 3, 2, 2, 'loot_core');
      if (i === 3) { R(cx - r - 2, cy - 2, 3, 2, '#FFFFFF'); R(cx + r, cy - 2, 3, 2, '#FFFFFF'); }
      if (i === 4) R(cx - 3, 0, 7, 1, 'loot_core');
      if (i === 2) R(cx, cy - 2, 1, 5, 'ink');
    }
    function fxHeart(i, w) { heart(w >> 1, 2, i === 0 && w > 8 ? 2 : 1, 'charm'); }
    function bubbleFrame(w, h, fill, edge, round) { R(round, 0, w - round * 2, h, edge); R(0, round, w, h - round * 2, edge); R(round, 1, w - round * 2, h - 2, fill); R(1, round, w - 2, h - round * 2, fill); if (round > 1) { R(1, 1, round, round, edge); R(w - 1 - round, 1, round, round, edge); R(1, h - 1 - round, round, round, edge); R(w - 1 - round, h - 1 - round, round, round, edge); R(2, 2, round - 1, round - 1, fill); R(w - 1 - round, 2, round - 1, round - 1, fill); R(2, h - 1 - round, round - 1, round - 1, fill); R(w - 1 - round, h - 1 - round, round - 1, round - 1, fill); } }
    function panel(w, h, focus) { R(2, 0, w - 4, h, focus ? 'text' : 'ground_rim'); R(0, 2, w, h - 4, focus ? 'text' : 'ground_rim'); R(2, 1, w - 4, h - 2, 'panel'); R(1, 2, w - 2, h - 4, 'panel'); }
    function sign(w, h, label, board, post) { if (post) R((w >> 1) - 2, h - 14, 4, 14, '#5A3A22'); R(1, 1, w - 2, h - (post ? 14 : 2), board || '#8A6A44'); R(2, 2, w - 4, 1, '#B0905A'); if (label) text(label, w >> 1, Math.max(3, ((h - (post ? 14 : 0)) >> 1) - 3), 'ink', 1); }
    function npc(w, h, body, extra) { var cx = w >> 1; R(cx - 7, h - 10, 5, 10, '#3A2A30'); R(cx + 2, h - 10, 5, 10, '#3A2A30'); disc(cx, h - 20, Math.min(12, w / 2 - 3), body); disc(cx, h - 36, 7, 'hero_skin'); R(cx - 3, h - 38, 2, 2, 'ink'); R(cx + 2, h - 38, 2, 2, 'ink'); if (extra) R(cx - 7, h - 31, 14, 6, extra); }

    var LV_ACC = ['accent_l1', 'accent_l2', 'accent_l3', 'accent_l4', 'accent_l5'];
    function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
    function tile(lv, i) {
      var acc = LV_ACC[lv];
      if (i >= 6 && i <= 8) { R(0, 0, 16, 6, lv === 4 ? '#E8E4DA' : '#5A4630'); R(0, 0, 16, 2, 'ground_rim'); R(0, 6, 16, 1, 'ink'); if (i !== 7) R(i === 6 ? 0 : 15, 0, 1, 7, 'ink'); return; }
      if (i >= 9) { if (i === 9) { R(4, 10, 6, 4, acc); R(5, 9, 4, 1, acc); } else if (i === 10) { R(7, 4, 2, 12, acc); R(5, 6, 2, 2, acc); } else { R(2, 12, 12, 2, acc); } return; }
      R(0, 0, 16, 16, 'ground');
      for (var k = 0; k < 6; k++) R(Math.floor(hash(i, k) * 15), Math.floor(hash(k, i + 7) * 15), 2, 1, k === 0 ? acc : '#2A2219');
      if (i <= 2) { R(0, 0, 16, 2, 'ground_rim'); R(0, 2, 16, 1, '#6A5A40'); }
      if (i === 0 || i === 3) R(0, 0, 1, 16, '#6A5A40');
      if (i === 2 || i === 5) R(15, 0, 1, 16, '#6A5A40');
    }
    function mix(a, b, t) { a = col(a); b = col(b); var p = function (s, o) { return parseInt(s.substr(o, 2), 16); }; var r = Math.round(p(a, 1) + (p(b, 1) - p(a, 1)) * t), g = Math.round(p(a, 3) + (p(b, 3) - p(a, 3)) * t), bl = Math.round(p(a, 5) + (p(b, 5) - p(a, 5)) * t); return 'rgb(' + r + ',' + g + ',' + bl + ')'; }
    function bgFar(lv) {
      for (var y = 0; y < 360; y += 8) R(0, y, 640, 8, mix('bg_far', mix(LV_ACC[lv], '#000000', 0.55), y / 360 * 0.6));
      var hz = mix('bg_far', LV_ACC[lv], 0.18);
      for (var x = 0; x < 640; x += 4) { var h = 60 + Math.sin(x / 640 * Math.PI * 4 + lv) * 24 + Math.sin(x / 640 * Math.PI * 10) * 8; R(x, 300 - h, 4, h + 60, hz); }
      if (lv === 0) disc(470, 120, 22, mix('bg_far', '#F2D6A0', 0.12));
    }
    function bgMid(lv) {
      var m = mix('bg_mid', LV_ACC[lv], 0.25), k;
      R(0, 300, 640, 60, m);
      if (lv === 0) { for (k = 0; k < 4; k++) { trap(80 + k * 160, 236 + (k % 2) * 20, 300, 20, 110, m); R(70 + k * 160, 200 + (k % 2) * 20, 4, 60, m); } }
      else if (lv === 1) { for (k = 0; k < 8; k++) { R(k * 80 + 10, 150, 60, 150, m); R(k * 80 + 20, 180, 40, 120, mix(m, 'bg_far', 0.6)); for (var b = 0; b < 4; b++) R(k * 80 + 24 + b * 10, 180, 2, 120, m); } }
      else if (lv === 2) { for (k = 0; k < 5; k++) { trap(k * 128 + 64, 60, 300, 4, 70, m); R(k * 128 + 40, 140, 48, 160, m); disc(k * 128 + 64, 160, 14, mix(m, LV_ACC[2], 0.5)); } }
      else if (lv === 3) { for (k = 0; k < 10; k++) { ring(k * 64 + 32, 300, 70, 5, m); } }
      else { R(0, 250, 640, 12, m); for (k = 0; k < 8; k++) { R(k * 80 + 20, 262, 6, 40, m); R(k * 80 + 38, 226, 4, 24, m); R(k * 80 + 38, 220, 4, 5, mix(m, 'telegraph', 0.3)); } }
    }
    function bgHideout() {
      for (var y = 0; y < 360; y += 8) R(0, y, 640, 8, mix('bg_far', '#2A2018', y / 360 * 0.7));
      R(0, 300, 640, 60, '#2A2219'); R(0, 300, 640, 2, 'ground_rim');
      R(40, 250, 120, 10, '#5A3A22'); R(48, 260, 8, 40, '#5A3A22'); R(144, 260, 8, 40, '#5A3A22');
      R(180, 262, 60, 38, '#6A4A2A'); R(180, 262, 60, 4, '#8A6A44');
      R(280, 0, 80, 44, '#4A1018'); text('STANDARD', 320, 14, 'text_dim', 1); text('LEAGUE', 320, 26, 'text_dim', 1);
      R(604, 268, 24, 32, '#3A3036'); R(600, 262, 32, 6, '#5A5058'); R(606, 246, 20, 16, 'rgba(200,220,240,0.25)');
    }
    function globe(i) {
      if (i === 3) { for (var k = 0; k < 8; k++) R(13 + k, 9 + (k > 3 ? 1 : 0) - (k > 1 && k < 6 ? 1 : 0), 2, 3, 'rgba(255,255,255,0.4)'); return; }
      ring(24, 24, 23, 4, i === 1 ? 'hp' : '#5A5A62'); ring(24, 24, 23, 1, 'ink');
      if (i === 2) for (var t = 0; t < 4; t++) R(22 + Math.round(Math.cos(t * 1.57) * 21), 22 + Math.round(Math.sin(t * 1.57) * 21), 4, 4, 'composure');
    }
    function pip(i) {
      if (i <= 2) { disc(6, 6, 5, ['fire', 'cold', 'lightning'][i]); if (i === 0) { R(5, 3, 2, 6, 'ink'); R(4, 6, 1, 3, 'ink'); } else if (i === 1) { R(3, 6, 7, 1, 'ink'); R(6, 3, 1, 7, 'ink'); } else { R(6, 2, 2, 4, 'ink'); R(4, 5, 4, 2, 'ink'); R(4, 7, 2, 3, 'ink'); } return; }
      disc(6, 6, 5, '#2A2A30'); ring(6, 6, 5, 1, 'ink');
      if (i >= 4 && i < 9) for (var k = 0; k <= i - 4; k++) R(3 + k * 2, 2 + (k % 2) * 4, 1, 5, '#FFFFFF');
    }

    var PROPS = {
      prop_sign_dresscode: function (i, w, h) { sign(w, h, 'DRESS', '#8A6A44', true); text('CODE', w >> 1, 12, 'ink', 1); R(10, 19, 12, 4, '#3A2A30'); R(9, 18, 14, 1, 'hp'); },
      prop_chest_tabula: function (i, w, h) { R(2, 8, 28, 16, '#6A4A2A'); R(2, 8, 28, 2, 'loot_divine'); R(14, 12, 4, 5, 'loot_divine'); if (i) { R(2, 0, 28, 8, '#5A3A22'); R(6, 6, 20, 4, '#E6E2D8'); } else R(2, 4, 28, 5, '#5A3A22'); },
      npc_merveil_shell: function (i) { trap(12, i ? 2 : 6, 15, 6, 22, '#E8B4C8'); R(9, 10, 2, 1, 'ink'); R(13, 10, 2, 1, 'ink'); R(10, 12, 4, 1, 'hp'); if (i) R(18, 0, 3, 3, 'text'); },
      npc_bestel: function (i, w, h) { npc(w, h, '#3A5A7A'); R(4, 26, 10, 8, '#B07040'); R(10, 28, 2, 1, 'ink'); R(12, 2 + (i ? 1 : 0), 8, 4, '#8A7060'); },
      prop_signup: function (i, w, h) { R(2, 2, 20, 28, '#E8E4DA'); R(8, 0, 8, 4, '#888'); for (var k = 0; k < 5; k++) text(k ? '~~~~' : 'BRUTUS', 12, 6 + k * 5, 'ink', 1); },
      prop_protein: function (i) { R(2, 4, 12, 12, '#2B3F6B'); R(2, i ? 0 : 2, 12, 3, '#E8E4DA'); R(4, 8, 8, 4, '#E8E4DA'); },
      prop_tally: function (i, w) { for (var k = 0; k < 6; k++) R(3 + k * 4, 6, 1, 10, '#C8C0B0'); R(2, 11, 24, 1, '#C8C0B0'); text('∞', w >> 1, 20, 'text', 1); },
      prop_window: function (i, w, h) { for (var y = 0; y < h; y += 4) for (var x = 0; x < w; x += 4) R(x, y, 4, 4, ['#3A5A9A', '#9A3A4A', '#C8A040', '#4A8A6A'][Math.floor(hash(x, y) * 4)]); R(0, 0, w, 2, 'ink'); R(0, 0, 2, h, 'ink'); R(w - 2, 0, 2, h, 'ink'); R((w >> 1) - 1, 0, 2, h, 'ink'); },
      prop_booth: function (i, w, h) { R(2, 4, 44, 60, '#5A3A22'); R(0, 0, 48, 6, '#6A4A2A'); R(8, 12, 32, 50, '#7A2030'); if (i) R(24, 12, 2, 50, '#5A1020'); },
      npc_einhar: function (i, w, h) { npc(w, h, '#7A5A3A', '#C08A50'); if (i) R(30, 10, 10, 3, 'hero_skin'); },
      npc_pigeon: function (i) { R(3, 5, 10, 5, '#8A8A96'); R(10 + i, 2 + i, 4, 4, '#8A8A96'); R(13 + i, 4 + i, 2, 1, 'loot_divine'); R(5, 10, 1, 2, 'telegraph'); R(9, 10, 1, 2, 'telegraph'); },
      prop_vanity: function (i, w, h) { R(4, 0, 40, 40, 'loot_divine'); R(7, 3, 34, 34, '#90A8C0'); for (var k = 0; k < 4; k++) { R(10 + k * 8, 14, 5, 14, 'cold'); R(10 + k * 8, 10, 5, 4, 'hero_skin'); } if (i === 2) R(36, 11, 2, 1, 'ink'); R(8, 40, 32, 8, '#6A4A2A'); },
      prop_menu: function (i, w, h) { sign(w, h, 'MENU', '#1E2622', true); text('EXILE', w >> 1, 13, 'text', 1); },
      prop_wetfloor: function () { trap(8, 0, 23, 4, 14, 'lightning'); text('!', 8, 8, 'ink', 1); },
      prop_reservation: function (i) { R(2, 6, 20, 10, '#6A2430'); if (i) { R(2, 2, 20, 8, '#E8E4DA'); R(12, 2, 1, 8, 'ink'); } },
      prop_tipjar: function (i) { R(2, 4, 12, 16, 'rgba(200,220,240,0.5)'); R(2, 2, 12, 3, '#888'); if (i) disc(8, 16, 2, 'loot_chaos'); text('$', 8, 9, 'ink', 1); },
      prop_dessert: function (i) { R(2, 20, 36, 4, '#6A4A2A'); R(4, 24, 3, 8, '#6A4A2A'); R(33, 24, 3, 8, '#6A4A2A'); if (i) { disc(20, 16, 3, 'loot_tailor'); trap(20, 2, 8, 6, 18, '#C0C0C8'); } else trap(20, 6, 19, 8, 28, '#C0C0C8'); }
    };

    var P1 = {
      hero_body: heroBody, hero_leggings: heroLeggings, hero_tunic: heroTunic, hero_cloak: heroCloak,
      hero_barrel: heroBarrel, hero_hat: heroHat, hero_tabula: heroTabula,
      grunt: grunt, caster: caster, elite: elite, foe_hats: foeHat,
      boss_hillock: hillock, boss_brutus: brutus, boss_dominus: dominus, boss_piety: piety, boss_heart: bheart, boss_kitava: kitava,
      proj_spark: function (i) { zig(1, 3 + (i & 1), 14, 4, 'hero_rim'); R(4, 5, 8, 1, '#FFFFFF'); },
      proj_bolt: function (i) { for (var y = 0; y < 11; y++) { var w = 11 - Math.abs(5 - y) * 2; R(6 - (w >> 1), y, w, 1, y === 0 || y === 10 ? 'ink' : '#F0F0F0'); } R(0, 5, 2 + i, 1, '#F0F0F0'); },
      proj_kiss: function (i) { heart(7, 3, 3, 'charm'); R(5, 6, 4, 2, 'censor_text'); },
      proj_censor: function (i) { R(0, i, 32, 11, 'censor'); for (var x = 0; x < 32; x += 4) R(x, 2 + i + ((x >> 2) % 2) * 4, 4, 4, '#E04A8A'); R(4, 4 + i, 24, 3, 'censor_text'); },
      proj_barbell: function (i) { if (i % 2) { R(14, 0, 4, 16, '#888'); R(10, 0, 12, 4, '#444'); R(10, 12, 12, 4, '#444'); } else { R(0, 7, 32, 3, '#888'); R(2, 1, 5, 14, '#444'); R(25, 1, 5, 14, '#444'); } R(i * 6 + 4, 2, 2, 2, 'lightning'); },
      proj_flask: function (i) { disc(6, 8, 5, 'fire'); R(4, (i % 2) ? 1 : 0, 4, 4, 'rgba(220,230,240,0.8)'); R(5, 0, 2, 2, '#8A6A44'); },
      proj_shockwave: function (i) { trap(16, 4 + i * 2, 23, 2, 30, 'phys'); },
      hz_plate: function (i) { R(0, 16, 32, 8, '#4A4A50'); R(0, 16, 32, 2, 'ground_rim'); if (i === 1 || i === 2) { hatch(0, 12, 32, 4, i, 'telegraph'); R(6 + i * 8, 10, 2, 2, 'lightning'); } if (i === 3) for (var k = 0; k < 4; k++) zig(2 + k * 8, 0, 4, 16, 'lightning'); },
      hz_acid: function (i) { R(0, 3, 32, 13, '#3A5A1A'); for (var x = 0; x < 32; x += 4) R(x, (x >> 2) % 2 ? 1 : 2, 4, 3, 'acid'); disc(6 + i * 7, 8, 2, 'acid'); R(10 + i * 5, 0, 1, 1, 'fire'); },
      hz_fire_puddle: function (i) { R(0, 8, 32, 4, 'fire'); for (var x = 0; x < 32; x += 4) R(x + 1, 4 + ((x >> 2) + i) % 3, 2, 4, (x >> 2) % 2 ? 'telegraph' : 'fire'); },
      hz_tell_ground: function (i) { hatch(0, 0, 32, 8, i, 'telegraph'); },
      hz_pillar: function (i) { var w = i === 0 ? 6 : i === 1 ? 20 : 12; R(12 - (w >> 1), 0, w, 112, 'fire'); R(12 - (w >> 2), 0, Math.max(1, w >> 1), 112, 'loot_divine'); },
      checkpoint: function (i) { trap(12, 4, 55, 8, 16, '#5A5048'); R(4, 52, 16, 4, 'ground_rim'); R(10, 18, 4, 10, i ? 'hero_rim' : '#3A3430'); },
      gate: function (i) { var top = i === 0 ? 0 : i === 1 ? -40 : -84; for (var k = 0; k < 4; k++) R(2 + k * 6, Math.max(0, 8 + top), 3, 88 + top - Math.max(0, 8 + top) + 8, '#6A5A4A'); for (var y = 16; y < 96 + top; y += 16) R(0, y, 24, 2, '#6A5A4A'); R(0, 0, 24, 8, 'ground_rim'); if (i === 0) R(9, 44, 6, 6, 'loot_divine'); },
      orbs: function (i) { orb(i, 16); },
      pickup_tea: function (i) { R(2, 7, 10, 6, '#F3EAD8'); R(0, 12, 14, 2, '#F3EAD8'); R(2, 7, 10, 1, 'charm'); R(12, 8, 2, 3, '#F3EAD8'); if (i) { R(5, 1, 1, 4, '#C8C8C8'); R(8, 2, 1, 3, '#C8C8C8'); } },
      pickup_flask: function () { R(4, 0, 4, 3, '#8A6A44'); R(3, 3, 6, 3, 'rgba(220,230,240,0.8)'); disc(6, 10, 5, 'hp'); },
      tiles_l1: function (i) { tile(0, i); }, tiles_l2: function (i) { tile(1, i); }, tiles_l3: function (i) { tile(2, i); }, tiles_l4: function (i) { tile(3, i); }, tiles_l5: function (i) { tile(4, i); },
      bg_l1_far: function () { bgFar(0); }, bg_l2_far: function () { bgFar(1); }, bg_l3_far: function () { bgFar(2); }, bg_l4_far: function () { bgFar(3); }, bg_l5_far: function () { bgFar(4); },
      bg_l1_mid: function () { bgMid(0); }, bg_l2_mid: function () { bgMid(1); }, bg_l3_mid: function () { bgMid(2); }, bg_l4_mid: function () { bgMid(3); }, bg_l5_mid: function () { bgMid(4); },
      bg_hideout: bgHideout,
      ui_globe: globe, ui_pips: pip,
      ui_globe_icon: function (i) { if (i === 0) heart(5, 3, 2, 'text'); else { R(1, 3, 6, 5, 'text'); R(7, 4, 2, 2, 'text'); R(0, 8, 9, 1, 'text'); } },
      ui_flask: function (i) { R(2, 0, 4, 3, '#8A6A44'); R(1, 3, 6, 11, 'ink'); R(2, 4, 4, 9, i ? '#3A3A42' : 'hp'); },
      ui_bossbar: function () { R(0, 0, 260, 14, 'ground_rim'); R(1, 1, 258, 12, 'panel'); },
      ui_panel: function () { panel(24, 24, false); },
      ui_bubble: function () { bubbleFrame(24, 24, 'text', 'ink', 3); },
      ui_bubble_tail: function () { for (var y = 0; y < 7; y++) { R(1, y, 6 - y, 1, 'text'); R(7 - y, y, 1, 1, 'ink'); } R(0, 0, 1, 8, 'ink'); },
      ui_heart_tell: function (i) { heart(6, 3, i ? 3 : 2, 'charm'); R(4, 2, 1, 1, '#FFFFFF'); },
      ui_alert: function (i) { bubbleFrame(12, 14, 'text', 'ink', 2); R(5, 2 + i, 2, 6, 'censor'); R(5, 10 + i, 2, 2, 'censor'); },
      ui_mash: function (i) { bubbleFrame(24, 24, 'text', 'ink', 3); if (i < 2) { R(6, 5 + i, 12, 13 - i, i ? '#C8C0B0' : '#FFFFFF'); R(6, 18, 12, 2, 'ink'); text('J', 12, 8 + i, 'ink', 1); } else { R(7, 4, 10, 16, '#FFFFFF'); R(7, 4, 5, 7, i === 3 ? 'censor' : '#C8C0B0'); R(7, 11, 10, 1, 'ink'); } },
      ui_reticle: function (i) { var r = i ? 'text_dim' : 'hero_rim'; R(7, 0, 2, 5, r); R(7, 11, 2, 5, r); R(0, 7, 5, 2, r); R(11, 7, 5, 2, r); },
      icon_currency: function (i) { orb(i, 12); },
      icon_portal: function (i) { ring(5, 7, 4, 2, i ? '#5A5A62' : 'hero_rim'); if (!i) R(4, 5, 2, 4, '#FFFFFF'); },
      ui_card: function (i) { panel(176, 104, i === 1); R(3, 3, 170, 14, '#4A1018'); },
      ui_button: function (i) { panel(96, 20, i === 1); },
      ui_weapon: function (i) { for (var k = 0; k < 22; k++) R(6 + k, 26 - k, 3, 3, i === 1 ? '#8A2020' : '#6A4A2A'); disc(28, 4, 3, i === 1 ? 'loot_vaal' : 'hero_rim'); if (i === 2) R(14, 10, 2, 8, '#FFFFFF'); },
      ui_stamp: function (i) { var r = i ? 'censor' : 'loot_vaal'; R(1, 1, 62, 22, r); c.clearRect(3, 3, 58, 18); text(i ? 'REMOVED' : 'CORRUPTED', 32, 8, i ? 'censor' : 'hp', 1); },
      ui_upvote: function (i) { var r = i ? '#7A8AA8' : 'telegraph'; for (var y = 0; y < 5; y++) R(5 - y, i ? 9 - y : y, y * 2 + 1, 1, r); R(3, i ? 0 : 5, 4, 5, r); },
      ui_modshield: function () { trap(8, 1, 15, 14, 2, '#F3EAD8'); R(5, 5, 6, 3, 'censor'); R(7, 8, 2, 4, 'censor'); },
      ui_touch: function (i) { if (i === 1) { disc(28, 28, 12, '#FFFFFF'); return; } ring(28, 28, 26, 2, '#FFFFFF'); if (i > 1) text(['', '', '^', 'A', 'B', 'R', 'F'][i], 28, 22, 'text', 2); },
      ui_pause: function () { panel(24, 24, false); R(8, 6, 3, 12, 'text'); R(14, 6, 3, 12, 'text'); },
      ui_logo: function () {
        Font.drawO(c, 'PATH OF', 160, 4, 4, 'text', 1);
        Font.drawO(c, 'EX ILES', 160, 42, 4, 'text', 1);
        R(74, 38, 54, 36, 'censor'); for (var x = 74; x < 128; x += 6) R(x, 44 + ((x / 6) % 2) * 12, 6, 6, '#E04A8A');
        heart(137, 54, 3, 'charm');
      },
      cut_door: function (i) { R(0, 0, 96, 128, '#3A3436'); R(12, 12, 72, 116, i === 0 ? '#F2C14E' : '#1A1416'); var w = i === 0 ? 50 : i === 1 ? 64 : 72; R(12, 12, w, 116, '#6A4A2A'); for (var k = 0; k < 3; k++) R(12, 30 + k * 34, w, 3, '#4A3020'); R(12 + w - 8, 70, 4, 4, 'loot_divine'); if (i === 2) { R(0, 118, 20, 10, 'phys'); R(76, 118, 20, 10, 'phys'); } },
      cut_pair: function (i) {
        var d = i ? 16 : 0; R(20 + d, 40, 18, 56, 'ink'); disc(29 + d, 30, 9, 'ink'); trap(29 + d, 4, 22, 2, 20, 'ink');
        R(60 - d, 20, 34, 76, 'ink'); disc(77 - d, 14, 12, 'ink');
        R(19 + d, 40, 1, 56, 'hero_rim'); R(94 - d, 20, 1, 76, 'charm');
        if (i) R(38 + d, 56, 22 - d * 2 + 6, 4, 'ink');
      },
      fx_hit: function (i) { var r = 2 + i * 2; R(8 - r, 7, r * 2, 2, '#FFFFFF'); R(7, 8 - r, 2, r * 2, '#FFFFFF'); if (i < 3) R(6, 6, 4, 4, 'loot_core'); },
      fx_spark_hit: function (i) { var r = 2 + i * 2; R(6 - r, 5, r * 2, 1, 'hero_rim'); R(5, 6 - r, 1, r * 2, 'hero_rim'); R(6 - r + 1, 6 - r + 1, 2, 2, 'hero_rim'); },
      fx_heart: function (i) { fxHeart(i, 8); },
      fx_sparkle: function (i) { var r = [1, 3, 2, 1][i]; R(4 - r, 3, r * 2, 2, 'text'); R(3, 4 - r, 2, r * 2, 'text'); },
      fx_dust: function (i) { disc(5 + i, 5, 3 - (i >> 1), 'ground_rim'); disc(11 - i, 5, 2, 'ground_rim'); },
      fx_layer: function (i) { var r = ['fire', 'cold', 'lightning'][i]; R(3, 5, 18, 14, r); R(5, 3, 14, 3, r); R(3, 12, 18, 1, 'ink'); },
      fx_sweat: function (i) { R(2, 1 + i, 2, 2, 'cold'); R(1, 3 + i, 4, 3, 'cold'); },
      fx_chomp: function (i) { if (i < 2) text('CHOMP', 12, 4 + i, 'telegraph', 1); else { R(2, 4, 20, 2, 'telegraph'); R(2, 10, 20, 2, 'telegraph'); } }
    };

    function outline(src, role, diag) {
      var o = canvas(src.width, src.height), x = o.getContext('2d'), sil = tinted(src, col(role), 'source-in', 1);
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if ((dx || dy) && (diag || !dx || !dy)) x.drawImage(sil, dx, dy);
      x.drawImage(src, 0, 0);
      return o;
    }

    function paint(name, spec) {
      var fw = spec.w, fh = spec.h, n = spec.frames || 1;
      var strip = canvas(fw * n, fh); c = strip.getContext('2d'); c.imageSmoothingEnabled = false;
      var fn = P1[name] || PROPS[name];
      for (var i = 0; i < n; i++) {
        c.save(); c.beginPath(); c.rect(i * fw, 0, fw, fh); c.clip(); c.translate(i * fw, 0);
        if (fn) fn(i, fw, fh);
        else if (!/^font_/.test(name)) { R(1, 1, fw - 2, fh - 2, 'censor'); R(0, 0, fw, 1, 'ink'); R(0, fh - 1, fw, 1, 'ink'); text(String(i), fw >> 1, (fh >> 1) - 3, 'censor_text', 1); }
        c.restore();
      }
      if (/^(bg_|tiles_|ui_|icon_|font_|fx_|cut_)/.test(name)) return strip;
      var out = outline(strip, 'ink', true);
      return name === 'hero_body' ? outline(out, 'hero_rim', false) : out;
    }

    return { paint: paint };
  })();

  api = { load: load, sprite: sprite, pal: pal, ALIAS: ALIAS, SFX_ALIAS: SFX_ALIAS, ready: false, names: names, canvas: canvas };
  return api;
})();
