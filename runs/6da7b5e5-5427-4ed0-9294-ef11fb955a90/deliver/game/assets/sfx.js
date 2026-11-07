// Last Light Pond SFX: every cue synthesised with WebAudio. Global SFX.play(name, opts?).
// Silent until the first user gesture; master gain 0.5 -> compressor -> destination; at most 8 voices.
(function (root) {
  'use strict';
  var ctx = null, master = null, noiseBuf = null, voices = [], muted = false, ambientNodes = null, ambientWant = false;
  var MAX_VOICES = 8, MASTER = 0.5;
  var semi = function (n) { return Math.pow(2, n / 12); };

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (root.addEventListener) {
    ['pointerdown', 'keydown', 'touchstart', 'mousedown'].forEach(function (ev) {
      root.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  }

  // ---- voice building blocks: each returns its end time ----
  // Gain envelope: 2 ms attack, exponential release to 0.0001.
  function env(t, dur, peak) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    return g;
  }
  function filter(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    return f;
  }
  // tone(t, {type, f: [start, end], glide, dur, gain, detune, through})
  function tone(t, o) {
    var osc = ctx.createOscillator(), g = env(t, o.dur, o.gain);
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f[0], t);
    if (o.f[1]) osc.frequency.exponentialRampToValueAtTime(o.f[1], t + (o.glide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.through) { osc.connect(o.through); o.through.connect(g); } else osc.connect(g);
    osc.start(t); osc.stop(t + o.dur + 0.02);
    return t + o.dur;
  }
  // noise(t, {dur, gain, type, freq: [start, mid?, end?], q})
  function noise(t, o) {
    var src = ctx.createBufferSource(), f = filter(o.type, o.freq[0], o.q), g = env(t, o.dur, o.gain);
    src.buffer = noiseBuf;
    if (o.freq.length === 2) f.frequency.exponentialRampToValueAtTime(o.freq[1], t + o.dur);
    if (o.freq.length === 3) {
      f.frequency.exponentialRampToValueAtTime(o.freq[1], t + o.dur * 0.45);
      f.frequency.exponentialRampToValueAtTime(o.freq[2], t + o.dur);
    }
    src.connect(f); f.connect(g);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.02);
    return t + o.dur;
  }
  function notes(t, type, freqs, step, len, last, gain) {
    var end = t;
    freqs.forEach(function (f, i) {
      end = tone(t + i * step, { type: type, f: [f], dur: i === freqs.length - 1 ? last : len, gain: gain });
    });
    return end;
  }
  function clicks(t, n, gap, gain) {
    for (var i = 0; i < n; i++) noise(t + i * gap, { dur: 0.015, gain: gain, type: 'highpass', freq: [3000] });
    return t + (n - 1) * gap + 0.015;
  }

  var C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, G4 = 392, B6 = 1975.5;

  var CUES = {
    hop: function (t) {
      tone(t, { type: 'square', f: [520, 780], dur: 0.045, gain: 0.08 });
      return tone(t, { f: [520, 780], glide: 0.09, dur: 0.18, gain: 0.25 });
    },
    land: function (t) {
      noise(t, { dur: 0.02, gain: 0.12, type: 'lowpass', freq: [600] });
      return tone(t, { f: [160, 90], glide: 0.07, dur: 0.12, gain: 0.3 });
    },
    tongue: function (t) { return tone(t, { f: [900, 1500], dur: 0.05, gain: 0.15 }); },
    catch: function (t, o) {
      var k = semi(Math.max(0, Math.min(8, (o && o.step) | 0)));
      tone(t, { type: 'triangle', f: [E6 * k], dur: 0.05, gain: 0.25 });
      return tone(t + 0.05, { type: 'triangle', f: [B6 * k], dur: 0.12, gain: 0.25 });
    },
    golden: function (t) { return notes(t, 'sine', [C6, E6, G6], 0.07, 0.4, 0.4, 0.3); },
    miss: function (t) {
      noise(t, { dur: 0.03, gain: 0.1, type: 'bandpass', freq: [800], q: 2 });
      return tone(t, { f: [300, 120], glide: 0.08, dur: 0.12, gain: 0.2 });
    },
    crack: function (t) { return clicks(t, 3, 0.04, 0.18); },
    thaw: function (t) {
      tone(t, { f: [G4, C5], glide: 0.25, dur: 0.45, gain: 0.24, detune: 6 });
      tone(t, { f: [G4, C5], glide: 0.25, dur: 0.45, gain: 0.24, detune: -6 });
      noise(t + 0.05, { dur: 0.2, gain: 0.15, type: 'bandpass', freq: [2000, 800], q: 3 });
      return t + 0.45;
    },
    // gust: wide bandpass loses most of the noise energy, so its gain sits above the 0.3 spec to be heard.
    gust: function (t) { return noise(t, { dur: 1.2, gain: 0.6, type: 'bandpass', freq: [400, 1400, 600], q: 0.7 }); },
    freeze: function (t) {
      var t1 = clicks(t, 3, 0.04, 0.15) + 0.03;
      tone(t1, { f: [2093], dur: 0.3, gain: 0.2 });
      return notes(t1 + 0.18, 'triangle', [G5, E5, C5, G4], 0.15, 0.15, 0.35, 0.25);
    },
    win: function (t) {
      var t1 = notes(t, 'triangle', [C5, E5, G5, C6], 0.09, 0.09, 0.4, 0.3);
      var lp = filter('lowpass', 400), g = ctx.createGain(), osc = ctx.createOscillator();
      osc.type = 'square'; osc.frequency.value = 110;
      g.gain.setValueAtTime(0.0001, t1);
      for (var i = 0; i < 3; i++) { // three croak pulses over 200 ms
        var p = t1 + i * 0.067;
        g.gain.exponentialRampToValueAtTime(0.3, p + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, p + 0.06);
      }
      osc.connect(lp); lp.connect(g); g.connect(master);
      osc.start(t1); osc.stop(t1 + 0.22);
      return t1 + 0.2;
    },
    ui: function (t) { return tone(t, { type: 'square', f: [660], dur: 0.04, gain: 0.15 }); }
  };

  function play(name, opts) {
    var cue = CUES[name];
    if (!cue || !ctx || muted || ctx.state !== 'running') return false;
    var now = ctx.currentTime;
    voices = voices.filter(function (end) { return end > now; });
    if (voices.length >= MAX_VOICES) return false;
    voices.push(cue(now + 0.005 + ((opts && opts.delay) || 0), opts));
    return true;
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.01);
  }

  // Optional cricket bed: two chirping sines, gain <= 0.05.
  // The wanted state is remembered, so a bed requested before the first gesture starts on unlock.
  function ambient(on) {
    ambientWant = !!on;
    if (!ctx || ctx.state !== 'running') return;
    if (!on && ambientNodes) { ambientNodes.forEach(function (n) { n.stop(); }); ambientNodes = null; }
    if (!on || ambientNodes) return;
    var osc = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain(), g = ctx.createGain();
    osc.frequency.value = 4200; lfo.type = 'square'; lfo.frequency.value = 3.2;
    g.gain.value = 0; depth.gain.value = 0.025;
    lfo.connect(depth); depth.connect(g.gain); osc.connect(g); g.connect(master);
    osc.start(); lfo.start();
    ambientNodes = [osc, lfo];
  }

  // Pause and tab-hide: silence everything, including the bed and any tails.
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() {
    if (!ctx) return;
    var p = ctx.state === 'suspended' ? ctx.resume() : null;
    var go = function () { ambient(ambientWant); };
    if (p && p.then) p.then(go, function () {}); else go();
  }

  root.SFX = {
    play: play, setMuted: setMuted, ambient: ambient, unlock: unlock, suspend: suspend, resume: resume,
    names: Object.keys(CUES),
    get muted() { return muted; },
    get ready() { return !!ctx && ctx.state === 'running'; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
