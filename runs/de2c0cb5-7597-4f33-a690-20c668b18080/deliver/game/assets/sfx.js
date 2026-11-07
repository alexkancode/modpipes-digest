/* sfx.js: every cue in asset-plan.json, synthesised with WebAudio.
 *
 *   SFX.play(name, rate = 1)  rate multiplies every frequency (combo steps, loot tiers, seeded jitter)
 *   SFX.suspend() / SFX.resume()   pause hooks
 *   SFX.volume(v)            master gain, default 0.5
 *   SFX.names                every cue name
 *
 * Silent until the first pointerdown / keydown / touchstart. No Math.random: callers pass seeded rates.
 * At most 8 voices; when full, the oldest swing/land is dropped first, otherwise the oldest voice.
 */
(function (root) {
  'use strict';

  // ---- Cue definitions -------------------------------------------------------
  // A cue is a list of layers. Tone T(wave, freqs, dur, gain, opts) or noise N(dur, gain, opts).
  // freqs glide (exponentially) through every point over opts.gt (default: dur).
  // opts: at (start offset s), a (attack s), r (release s; default: decay over the whole note),
  //       fil [type, f0, f1?, q?] swept f0->f1 over dur, vib [hz, depthHz], trem [hz, depth, wave?],
  //       dist (soft clip), k (extra rate multiplier, used by ref()).
  const T = (w, f, d, g, o) => Object.assign({ w, f, d, g }, o);
  const N = (d, g, o) => Object.assign({ w: 'noise', d, g }, o);
  const ref = (name, k = 1) => CUES[name].map(l => Object.assign({}, l, { k: (l.k || 1) * k }));
  const at = (t, layer) => Object.assign(layer, { at: (layer.at || 0) + t });
  const seq = (n, step, make) => Array.from({ length: n }, (_, i) => at(i * step, make(i)));

  const CUES = {};
  const def = (name, layers) => { CUES[name] = layers; };

  // Movement and combat
  def('jump',       [T('square', [330, 660], 0.21, 0.15, { gt: 0.12 })]);
  def('land',       [N(0.04, 1.0, { fil: ['lowpass', 800] })]);
  def('swing',      [N(0.09, 0.9, { fil: ['bandpass', 2000, 600, 0.7] })]);
  def('hit',        [T('square', [900, 180], 0.13, 0.17, { gt: 0.02 }), N(0.03, 0.3, { fil: ['highpass', 2000] })]);
  def('hit_heavy',  [...ref('hit'), T('sine', [450, 90], 0.16, 0.45, { gt: 0.02 })]);
  def('spark_cast', [T('sawtooth', [600, 1800], 0.06, 0.13, { fil: ['highpass', 1000] }),
                     N(0.08, 0.5, { at: 0.02, fil: ['highpass', 1000], trem: [55, 1, 'square'] })]);
  def('spark_hit',  [N(0.05, 0.9, { fil: ['bandpass', 3000, 3000, 0.7] }), T('square', [1400], 0.02, 0.12)]);
  def('hurt',       [T('sawtooth', [500, 120], 0.16, 0.38, { fil: ['lowpass', 2000] })]);
  def('roll',       [N(0.18, 0.9, { a: 0.06, fil: ['lowpass', 400, 1600] })]);
  def('flask',      [220, 180, 240].map((f, i) => T('sine', [f, f * 1.3], 0.06, 0.35, { at: i * 0.09, a: 0.01, fil: ['lowpass', 900] })));

  // Charm, escape, layers, censor bars
  def('charm_tell',    [T('sine', [300, 520], 0.4, 0.3, { a: 0.34, r: 0.06, vib: [5, 14] })]);
  def('charm_hit',     [T('sine', [180, 420, 260], 0.22, 0.38, { vib: [24, 18] })]);
  def('escape',        [T('triangle', [1318], 0.07, 0.25, { r: 0.06 }), T('triangle', [1760], 0.37, 0.25, { at: 0.07 })]);
  def('swoon',         [T('sawtooth', [1200, 200], 0.08, 0.15, { r: 0.01 }), T('sawtooth', [200, 900], 0.06, 0.15, { at: 0.08 }),
                        N(0.14, 0.3, { fil: ['bandpass', 1500, 1500, 0.7] })]);
  def('layer_pop',     [N(0.07, 0.6, { fil: ['bandpass', 1500, 5000, 0.7] }), T('square', [880], 0.03, 0.12)]);
  def('uncapped',      [T('square', [392], 0.12, 0.13, { r: 0.02 }), T('square', [330], 0.12, 0.13, { at: 0.12, r: 0.04 })]);
  def('censor_slap',   [N(0.03, 0.45, { fil: ['lowpass', 3000] }), T('sine', [220, 440], 0.15, 0.32, { at: 0.01 })]);
  def('censor_squeak', [T('square', [1600, 2200, 1700], 0.12, 0.08, { a: 0.01, r: 0.03 })]);

  // Loot and pickups
  def('loot_drop',      [T('sine', [2093], 0.6, 0.15, { vib: [6, 6] })]);
  def('divine_ding',    [T('sine', [2637], 0.9, 0.35), T('sine', [3951], 0.6, 0.12)]);
  def('pickup_chaos',   [T('square', [1046], 0.06, 0.12, { r: 0.05 }), T('square', [1568], 0.25, 0.12, { at: 0.06 })]);
  def('pickup_tailor',  [...ref('pickup_chaos', 1.12), T('square', [2093], 0.03, 0.08, { at: 0.12 })]);
  def('pickup_vaal',    [T('square', [523], 0.06, 0.09, { r: 0.05, dist: true }), T('square', [784], 0.3, 0.09, { at: 0.06, dist: true })]);
  def('pickup_exalted', [...ref('pickup_chaos'), T('square', [2093], 0.4, 0.1, { at: 0.12 })]);
  def('pickup_divine',  [...ref('pickup_exalted'), T('sine', [2637], 0.6, 0.25, { at: 0.18, vib: [8, 10] })]);
  def('pickup_tea',     [N(0.12, 0.4, { fil: ['lowpass', 600] }), T('sine', [330, 294], 0.2, 0.3, { at: 0.1, a: 0.04 })]);
  def('pickup_flask',   [T('sine', [2400], 0.15, 0.25), T('sine', [3600], 0.15, 0.15)]);

  // Enemies and bosses
  def('enemy_windup', [T('sine', [200, 500], 0.5, 0.18, { a: 0.44, r: 0.06 })]);
  def('enemy_die',    [T('square', [300, 80], 0.18, 0.15), N(0.12, 0.35, { at: 0.03, fil: ['lowpass', 1200] })]);
  def('bolt_fire',    [T('square', [440, 660], 0.05, 0.16), N(0.04, 0.6, { fil: ['bandpass', 1500, 1500, 0.7] })]);
  def('kiss_blow',    [N(0.015, 0.4, { fil: ['highpass', 1500] }), T('sine', [600, 900], 0.08, 0.32, { at: 0.01 })]);
  def('boss_intro',   [110, 165].map(f => T('sawtooth', [f], 0.5, 0.14, { a: 0.02, r: 0.2, fil: ['lowpass', 300, 3000] })));
  def('boss_phase',   [T('sawtooth', [60], 0.7, 0.22, { r: 0.3, fil: ['lowpass', 200, 2000] }),
                       N(0.7, 0.35, { r: 0.3, fil: ['lowpass', 200, 2000] })]);
  def('boss_defeat',  [T('square', [523], 0.09, 0.13, { r: 0.02 }), T('square', [659], 0.09, 0.13, { at: 0.09, r: 0.02 }),
                       T('square', [784], 0.6, 0.13, { at: 0.18 })]);
  def('flex',         [T('sawtooth', [90, 140], 0.3, 0.2, { a: 0.05 }), N(0.3, 0.6, { fil: ['bandpass', 400, 400, 1.5], trem: [14, 0.8] })]);
  def('shockwave',    [N(0.25, 0.45, { fil: ['lowpass', 300] }), T('sine', [55], 0.3, 0.4)]);
  def('barbell',      [N(0.2, 0.8, { fil: ['bandpass', 800, 300, 0.7] }), T('sawtooth', [1200], 0.2, 0.1, { at: 0.05, trem: [40, 1, 'square'] })]);
  def('pillar',       [N(0.5, 0.5, { a: 0.05, r: 0.2, fil: ['lowpass', 1200], trem: [12, 0.6] })]);
  def('nova',         [T('triangle', [1760, 880], 0.4, 0.25), N(0.4, 0.2, { fil: ['highpass', 4000] })]);
  def('heartbeat',    seq(2, 0.14, () => T('sine', [70], 0.08, 0.6)));
  def('acid',         [N(0.2, 0.35, { fil: ['highpass', 3000], trem: [37, 0.9, 'square'] })]);
  def('plate_zap',    [T('square', [1200], 0.25, 0.1, { trem: [40, 1] }), N(0.25, 0.2, { fil: ['highpass', 2000], trem: [40, 1] })]);
  def('chomp',        [N(0.04, 0.45, { fil: ['lowpass', 2000] }), T('square', [160, 90], 0.08, 0.18)]);
  def('belch',        [T('sawtooth', [90, 60], 0.6, 0.35, { a: 0.03, vib: [18, 8], trem: [18, 0.4], fil: ['lowpass', 700] })]);
  def('door_slam',    [N(0.12, 0.55, { fil: ['lowpass', 500] }), T('sine', [80], 0.2, 0.5)]);

  // Death, world, gags
  def('death',        seq(3, 0.2, i => T('square', [440, 55], 0.2, 0.13, { k: Math.pow(0.84, i) })));
  def('portal',       [T('sine', [330, 990], 0.4, 0.3, { a: 0.1 }), N(0.4, 0.15, { a: 0.15, fil: ['highpass', 5000] })]);
  def('checkpoint',   [T('triangle', [784], 0.3, 0.25), T('triangle', [1175], 0.3, 0.18)]);
  def('gate_lock',    [N(0.06, 0.6, { fil: ['bandpass', 900, 900, 1] }), T('square', [140], 0.12, 0.15)]);
  def('gate_open',    [N(0.3, 1.0, { fil: ['bandpass', 600, 1200, 0.7], trem: [25, 0.7, 'square'] })]);
  def('whisper',      [T('square', [880], 0.04, 0.12, { r: 0.01 }), T('square', [1320], 0.04, 0.12, { at: 0.05 })]);
  def('speech',       [T('square', [520], 0.025, 0.1, { r: 0.01 })]);
  def('gag',          [T('sine', [98], 0.1, 0.5), T('sine', [73], 0.12, 0.5, { at: 0.14 }), N(0.2, 0.2, { at: 0.3, fil: ['highpass', 6000] })]);
  def('tabula',       seq(6, 0.045, i => T('square', [523 * Math.pow(1568 / 523, i / 5)], 0.04, 0.11, { r: 0.01 })));
  def('mirror_lol',   seq(4, 0.045, i => T('square', [i % 2 ? 880 : 660], 0.04, 0.1, { r: 0.01 })));

  // Levels, hideout, UI
  def('level_banner', [N(0.12, 0.5, { fil: ['bandpass', 2000, 2000, 0.7] }), T('square', [660], 0.05, 0.1, { at: 0.08 })]);
  def('level_clear',  seq(4, 0.07, i => T('sawtooth', [262, 523], i < 3 ? 0.07 : 0.29, 0.2, { k: Math.pow(1.12, i), gt: 0.07 })));
  def('card_pick',    [N(0.05, 0.35, { fil: ['highpass', 2500] }), T('square', [990], 0.06, 0.1, { at: 0.02 })]);
  def('craft_chaos',  [T('sine', [400, 800, 400], 0.3, 0.15), T('sine', [400, 800, 400], 0.3, 0.12, { k: 1.012 })]);
  def('craft_exalt',  [N(0.08, 0.5, { fil: ['lowpass', 600] }), T('square', [784], 0.2, 0.1), T('square', [1046], 0.2, 0.1)]);
  def('vaal_success', [220, 277, 330].map(f => T('sawtooth', [f], 0.5, 0.1, { a: 0.03, r: 0.25, fil: ['lowpass', 1200] })));
  def('vaal_brick',   [...seq(3, 0.25, i => T('sawtooth', [[233, 220, 208][i]], 0.24, 0.14, { r: 0.04, fil: ['lowpass', 1500] })),
                       T('sawtooth', [196], 0.45, 0.14, { at: 0.75, vib: [6, 6], fil: ['lowpass', 1500] })]);
  def('ui_select',    [T('square', [660], 0.05, 0.14, { fil: ['highpass', 400] })]);
  def('ui_back',      [T('square', [440], 0.05, 0.14)]);
  def('ui_confirm',   [T('square', [660], 0.04, 0.1, { r: 0.01 }), T('square', [990], 0.04, 0.1, { at: 0.045 })]);

  // ---- Engine ----------------------------------------------------------------
  const MAX_VOICES = 8;
  const DROPPABLE = { swing: 1, land: 1 };
  const voices = [];            // { name, end, bus }
  let ctx = null, master = null, noiseBuf = null, clipCurve = null;
  let paused = false, masterGain = 0.5;

  function unlock() {
    if (ctx) return;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = masterGain;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0, s = 0x9e3779b9; i < data.length; i++) {  // xorshift: same noise every run
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      data[i] = (s >>> 0) / 2147483648 - 1;
    }
    clipCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) clipCurve[i] = Math.tanh(2.5 * (i / 127.5 - 1)) / Math.tanh(2.5);
    if (paused) ctx.suspend(); else if (ctx.resume) ctx.resume();
    GESTURES.forEach(t => root.removeEventListener(t, unlock, true));
  }
  const GESTURES = ['pointerdown', 'keydown', 'touchstart', 'mousedown'];
  if (root.addEventListener) GESTURES.forEach(t => root.addEventListener(t, unlock, true));

  // param follows points[] exponentially over span seconds from t0
  function glide(param, points, t0, span) {
    param.setValueAtTime(points[0], t0);
    for (let i = 1; i < points.length; i++) param.exponentialRampToValueAtTime(points[i], t0 + span * i / (points.length - 1));
  }

  function lfo(hz, wave, t0, t1) {
    const o = ctx.createOscillator();
    o.type = wave || 'sine';
    o.frequency.value = hz;
    o.start(t0); o.stop(t1);
    return o;
  }

  function layer(L, rate, t0, bus) {
    const k = rate * (L.k || 1), d = L.d, start = t0 + (L.at || 0), end = start + d;
    let src;
    if (L.w === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      src.playbackRate.value = Math.min(4, Math.max(0.25, k));
    } else {
      src = ctx.createOscillator();
      src.type = L.w;
      glide(src.frequency, L.f.map(f => f * k), start, L.gt || d);
      if (L.vib) {
        const v = lfo(L.vib[0], 'sine', start, end), depth = ctx.createGain();
        depth.gain.value = L.vib[1] * k;
        v.connect(depth).connect(src.frequency);
      }
    }

    // amplitude envelope: attack, optional hold, exponential release to 0.0001 (never 0)
    const env = ctx.createGain(), a = L.a || 0.004, r = L.r || d - a;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(L.g, start + a);
    env.gain.setValueAtTime(L.g, Math.max(start + a, end - r));
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    let node = src.connect(env);

    if (L.trem) {                           // gain = (1 - depth/2) + lfo * depth/2
      const am = ctx.createGain(), depth = ctx.createGain();
      am.gain.value = 1 - L.trem[1] / 2;
      depth.gain.value = L.trem[1] / 2;
      lfo(L.trem[0], L.trem[2], start, end).connect(depth).connect(am.gain);
      node = node.connect(am);
    }
    if (L.dist) {
      const ws = ctx.createWaveShaper();
      ws.curve = clipCurve;
      node = node.connect(ws);
    }
    if (L.fil) {
      const [type, f0, f1, q] = L.fil, f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = q || 0.7;
      glide(f.frequency, f1 && f1 !== f0 ? [f0 * k, f1 * k] : [f0 * k], start, d);
      node = node.connect(f);
    }
    node.connect(bus);
    src.start(start);
    src.stop(end + 0.02);
    return end;
  }

  function freeVoice(now) {
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= now) voices.splice(i, 1);
    if (voices.length < MAX_VOICES) return;
    let i = voices.findIndex(v => DROPPABLE[v.name]);
    if (i < 0) i = 0;                      // voices are in start order, so 0 is the oldest
    const bus = voices[i].bus;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    setTimeout(() => bus.disconnect(), 40);
    voices.splice(i, 1);
  }

  function play(name, rate) {
    const cue = CUES[name];
    if (!cue) { if (root.console) console.warn('SFX: unknown cue ' + name); return; }
    if (!ctx || paused) return;
    const now = ctx.currentTime, t0 = now + 0.005;
    freeVoice(now);
    const bus = ctx.createGain();
    bus.connect(master);
    let end = t0;
    for (const L of cue) end = Math.max(end, layer(L, rate > 0 ? rate : 1, t0, bus));
    voices.push({ name, end: end + 0.03, bus });
  }

  // ---- Music bed: a quiet per-track loop (drone + soft arpeggio), scheduled 0.6 s ahead by a 200 ms timer ----
  // Tracks: 1-5 levels, 6 hideout, 0 off. Patterns are fixed, so no randomness is involved.
  const TRACKS = [null,
    { root: 110.0, bpm: 84, steps: [0, 7, 12, 7, 3, 7, 10, 7], wave: 'triangle' },   // Strand: lazy tide
    { root: 98.0, bpm: 96, steps: [0, 3, 7, 3, 0, 3, 8, 7], wave: 'square' },       // Prison: gym metronome
    { root: 116.5, bpm: 72, steps: [0, 7, 12, 15, 12, 7, 5, 7], wave: 'sine' },     // Cathedral: choir
    { root: 87.3, bpm: 88, steps: [0, 1, 7, 1, 0, 6, 7, 6], wave: 'triangle' },     // Belly: queasy
    { root: 103.8, bpm: 104, steps: [0, 4, 7, 11, 12, 11, 7, 4], wave: 'square' },  // Feast: lounge
    { root: 130.8, bpm: 70, steps: [0, 4, 7, 4, 9, 7, 4, 2], wave: 'sine' }];       // Hideout
  let track = 0, musicBus = null, nextNote = 0, step = 0, timer = 0;
  function note(f, t, d, g, wave) {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = wave; o.frequency.value = f;
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(e); e.connect(musicBus); o.start(t); o.stop(t + d + 0.02);
  }
  function schedule() {
    timer = 0;
    const tr = TRACKS[track > 10 ? track - 10 : track];   // 11-15: the level's track in boss mode
    if (!tr) return;
    if (ctx && !paused) {
      if (!musicBus) { musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master); }
      const beat = 60 / tr.bpm / 2;
      if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.05;
      const boss = track > 10, beatB = boss ? beat * 0.8 : beat;
      while (nextNote < ctx.currentTime + 0.6) {
        const bar = (step >> 3) & 3, lift = bar === 3 ? 5 : bar === 2 ? -2 : 0;   // every 4th bar lifts a fourth, the 3rd dips
        const f = tr.root * Math.pow(2, (tr.steps[step % 8] + lift) / 12) * 2;
        note(f, nextNote, beatB * 0.9, tr.wave === 'square' ? 0.05 : 0.09, tr.wave);
        if (step % 8 === 0) note(tr.root * Math.pow(2, lift / 12), nextNote, beatB * 7.5, 0.12, 'triangle');
        if (bar & 1 && step % 2 === 1) note(f * 2, nextNote, beatB * 0.4, 0.03, 'sine');            // second layer: sparkle on odd bars
        if (boss && step % 2 === 0) note(tr.root / 2, nextNote, beatB * 0.5, 0.14, 'square');       // boss: driving low pulse
        step++; nextNote += beatB;
      }
    }
    timer = setTimeout(schedule, 200);
  }
  function music(n) {
    n = n | 0;
    if (n === track) return;
    track = TRACKS[n > 10 ? n - 10 : n] ? n : 0; step = 0; nextNote = 0;
    if (track && !timer) schedule();
  }

  root.SFX = {
    play,
    music,
    suspend() { paused = true; if (ctx) ctx.suspend(); },
    resume() { paused = false; if (ctx) ctx.resume(); },
    volume(v) { masterGain = v; if (master) master.gain.value = v; },
    unlock,                         // call from inside a gesture handler if the page swallows events
    names: Object.keys(CUES),
    get ready() { return !!ctx && !paused; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SFX;
})(typeof window !== 'undefined' ? window : globalThis);
