/* Neon Kaiju SFX: every cue synthesised with WebAudio. Global SFX.
 *   SFX.play(name, opts?)  opts: { gain = 1, pitch = 1, step = 0 }  (step: combo semitone)
 *   SFX.muted / SFX.setMuted(bool) / SFX.toggleMute()   SFX.names   SFX.unlock()
 * Silent until the first user gesture (pointerdown / keydown / touchstart) creates the context.
 * Caps: master gain 0.35, at most 8 voices total and 2 per cue name. Heavy cues (stomp, crumble, roar, hurt)
 * skip the total cap so late-game gunfire never drops them.  SFX.suspend() / SFX.resume() pause the context.
 */
(function (root) {
  "use strict";
  var MASTER = 0.35, MAX_VOICES = 8, MAX_PER_CUE = 2;
  var ctx = null, out = null, white = null, brown = null, muted = false;
  var live = [];  // { name, end }
  var PRIORITY = { stomp: 1, crumble: 1, roar: 1, hurt: 1 };

  function unlock() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      out = ctx.createGain();
      out.gain.value = muted ? 0 : MASTER;
      out.connect(comp);
      comp.connect(ctx.destination);
      white = noiseBuffer(false);
      brown = noiseBuffer(true);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function noiseBuffer(isBrown) {
    var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      d[i] = isBrown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w;
    }
    return buf;
  }

  // ---- building blocks: each returns nothing, schedules nodes into `dest`
  function env(t, dur, peak, attack) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  function tone(dest, type, f0, f1, t, dur, peak, attack) {
    var o = ctx.createOscillator(), g = env(t, dur, peak, attack);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  // noise through a filter whose frequency ramps f0 -> f1
  function noise(dest, buf, type, f0, f1, q, t, dur, peak, attack) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = env(t, dur, peak, attack);
    s.buffer = buf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    return g;
  }

  function jitter(p, amt) { return p * (1 + (Math.random() * 2 - 1) * amt); }

  // ---- cues: (dest, t, pitch, opts) -> duration in seconds
  var CUES = {
    stomp: function (d, t, p) {
      p = jitter(p, 0.06);
      tone(d, "sine", 95 * p, 28 * p, t, 0.38, 0.8, 0.004);
      tone(d, "square", 62 * p, 24 * p, t, 0.38, 0.22, 0.004);
      noise(d, brown, "lowpass", 400, 80, 0.7, t, 0.2, 0.5, 0.002);
      return 0.38;
    },
    crack: function (d, t, p) {
      noise(d, white, "bandpass", 1200 * p, 900 * p, 2, t, 0.12, 1.3, 0.002);
      return 0.12;
    },
    crumble: function (d, t, p) {
      noise(d, brown, "lowpass", 2000 * p, 150 * p, 0.8, t, 0.6, 0.9, 0.01);
      tone(d, "sine", 70 * p, 35 * p, t, 0.5, 0.6, 0.005);
      for (var i = 0; i < 5; i++) {
        var f = (110 + Math.random() * 350) * p, at = t + Math.random() * 0.3;
        tone(d, "sawtooth", f, f * 0.7, at, 0.07, 0.06, 0.003);
      }
      return 0.6;
    },
    swipe: function (d, t, p) {
      noise(d, white, "bandpass", 600 * p, 2400 * p, 1.5, t, 0.16, 1.1, 0.01);
      return 0.16;
    },
    swipe_hit: function (d, t, p) {
      tone(d, "square", 300 * p, 90 * p, t, 0.1, 0.25, 0.002);
      noise(d, white, "highpass", 3000, 3000, 0.7, t, 0.02, 0.5, 0.001);
      return 0.1;
    },
    beam_charge: function (d, t, p) {
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 1500; f.connect(d);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(120 * p, t);
      o.frequency.exponentialRampToValueAtTime(480 * p, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.24);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
      o.connect(g); g.connect(f);
      o.start(t); o.stop(t + 0.3);
      return 0.27;
    },
    beam: function (d, t, p) {
      var hold = 0.35, rel = 0.12;
      var trem = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      trem.gain.value = 0.6; lfo.frequency.value = 18; depth.gain.value = 0.4;
      lfo.connect(depth); depth.connect(trem.gain); trem.connect(d);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.02);
      g.gain.setValueAtTime(1, t + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
      g.connect(trem);
      var o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 90 * p;
      var og = ctx.createGain(); og.gain.value = 0.22; o.connect(og); og.connect(g);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), sg = ctx.createGain();
      s.buffer = white; f.type = "bandpass"; f.frequency.value = 3000 * p; f.Q.value = 1.2; sg.gain.value = 0.7;
      s.connect(f); f.connect(sg); sg.connect(g);
      var end = t + hold + rel + 0.02;
      o.start(t); s.start(t); lfo.start(t);
      o.stop(end); s.stop(end); lfo.stop(end);
      return hold + rel;
    },
    roar: function (d, t, p) {
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 900; f.Q.value = 3; f.connect(d);
      tone(f, "sawtooth", 140 * p, 60 * p, t, 0.7, 0.45, 0.08);
      tone(f, "square", 144 * p, 62 * p, t, 0.7, 0.25, 0.08);
      noise(d, white, "bandpass", 900 * p, 400 * p, 0.8, t, 0.7, 0.35, 0.1);
      return 0.7;
    },
    tank_shot: function (d, t, p) {
      tone(d, "square", 700 * p, 300 * p, t, 0.08, 0.3, 0.002);
      noise(d, white, "highpass", 1500, 1500, 0.7, t, 0.03, 0.4, 0.001);
      return 0.08;
    },
    heli_shot: function (d, t, p) {
      for (var i = 0; i < 3; i++) noise(d, white, "highpass", 2000 * p, 2000 * p, 0.7, t + i * 0.1, 0.05, 0.6, 0.001);
      return 0.25;
    },
    unit_die: function (d, t, p) {
      p = jitter(p, 0.05);
      noise(d, white, "lowpass", 1500 * p, 200 * p, 0.8, t, 0.35, 0.7, 0.003);
      tone(d, "sine", 160 * p, 30 * p, t, 0.35, 0.6, 0.003);
      return 0.35;
    },
    hurt: function (d, t, p) {
      tone(d, "square", 220 * p, 70 * p, t, 0.22, 0.25, 0.003);
      return 0.22;
    },
    heal: function (d, t, p) {
      tone(d, "sine", 660 * p, 660 * p, t, 0.08, 0.35, 0.004);
      tone(d, "sine", 990 * p, 990 * p, t + 0.06, 0.09, 0.35, 0.004);
      return 0.15;
    },
    combo: function (d, t, p, o) {
      var f = 440 * Math.pow(2, (o.step || 0) / 12) * p;
      tone(d, "square", f, f, t, 0.08, 0.18, 0.003);
      return 0.08;
    },
    heartbeat: function (d, t, p) {
      tone(d, "sine", 55 * p, 50 * p, t, 0.1, 0.8, 0.008);
      tone(d, "sine", 55 * p, 50 * p, t + 0.12, 0.1, 0.6, 0.008);
      return 0.22;
    },
    siren: function (d, t, p) {
      for (var i = 0; i < 4; i++) {
        var f = (i % 2 ? 700 : 520) * p;
        tone(d, "triangle", f, f, t + i * 0.15, 0.15, 0.18, 0.01);
      }
      return 0.6;
    },
    step: function (d, t, p) {
      p = jitter(p, 0.08);
      tone(d, "sine", 70 * p, 40 * p, t, 0.12, 0.25, 0.004);
      return 0.12;
    },
    ui: function (d, t, p) {
      var f = ctx.createBiquadFilter();
      f.type = "highpass"; f.frequency.value = 400; f.connect(d);
      tone(f, "square", 880 * p, 880 * p, t, 0.05, 0.2, 0.002);
      return 0.05;
    }
  };

  function play(name, opts) {
    var cue = CUES[name];
    if (!cue || !ctx || muted || ctx.state !== "running") return false;
    opts = opts || {};
    var t = ctx.currentTime, perCue = 0, i;
    for (i = live.length - 1; i >= 0; i--) if (live[i].end <= t) live.splice(i, 1);
    for (i = 0; i < live.length; i++) if (live[i].name === name) perCue++;
    if (perCue >= MAX_PER_CUE || (live.length >= MAX_VOICES && !PRIORITY[name])) return false;
    var g = ctx.createGain();
    g.gain.value = opts.gain == null ? 1 : opts.gain;
    g.connect(out);
    var dur = cue(g, t + 0.005, opts.pitch || 1, opts);
    live.push({ name: name, end: t + dur + 0.05 });
    return true;
  }

  function setMuted(m) {
    muted = !!m;
    if (out) out.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.02);
  }

  var SFX = {
    play: play,
    unlock: unlock,
    names: Object.keys(CUES),
    setMuted: setMuted,
    suspend: function () { if (ctx && ctx.state === "running") ctx.suspend(); },
    resume: function () { if (ctx && ctx.state === "suspended") ctx.resume(); },
    toggleMute: function () { setMuted(!muted); return muted; },
    get muted() { return muted; },
    get ready() { return !!ctx && ctx.state === "running"; }
  };
  root.SFX = SFX;

  if (root.addEventListener) {
    ["pointerdown", "keydown", "touchstart", "mousedown"].forEach(function (ev) {
      root.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
