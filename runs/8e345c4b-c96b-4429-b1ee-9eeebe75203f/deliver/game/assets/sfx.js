// sfx.js: WebAudio chiptune cues for the frog-and-fireflies pond game.
// Global SFX:
//   SFX.play(name, rate = 1)  play a cue; rate multiplies every oscillator pitch
//                             (catch: 2^(step/12), creak: 1..1.5, spawn: 1.26 for goldens)
//   SFX.suspend() / SFX.resume()   pause hooks; suspend the whole audio clock
//   SFX.setMuted(bool), SFX.muted  master mute
//   SFX.names                 every cue name
// Silent until the first pointer, key or touch gesture: no AudioContext exists before it,
// so play() is a no-op until then.
(function (root) {
  'use strict';

  let ctx = null, master = null, noiseBuf = null;
  let paused = false, muted = false;
  let t0 = 0, rate = 1;          // set per play(): cue start time and pitch multiplier
  const pulses = {};             // duty -> PeriodicWave

  // ---------- building blocks ----------

  function pulseWave(duty) {
    if (!pulses[duty]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      pulses[duty] = ctx.createPeriodicWave(re, im);
    }
    return pulses[duty];
  }

  // Gain envelope: 0 -> g*punch over a, settle to g in 10 ms, exponential fade over d.
  function envelope(at, a, d, g, punch) {
    const env = ctx.createGain(), s = t0 + at;
    env.gain.setValueAtTime(0, s);
    env.gain.linearRampToValueAtTime(g * punch, s + a);
    if (punch !== 1) env.gain.linearRampToValueAtTime(g, s + a + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, s + a + d);
    return env;
  }

  // A filter (optionally sweeping f -> to over sweep seconds) feeding `out`.
  function filter(type, f, { to = f, sweep = 0, Q = 1, at = 0, out = master } = {}) {
    const fl = ctx.createBiquadFilter(), s = t0 + at;
    fl.type = type; fl.Q.value = Q;
    fl.frequency.setValueAtTime(f, s);
    if (to !== f) fl.frequency.exponentialRampToValueAtTime(to, s + sweep);
    fl.connect(out);
    return fl;
  }

  // One oscillator voice. Pitch glides f -> to over glide, or steps through `steps` every `step` s.
  function voice({ type = 'square', duty, f, to = f, glide = 0, steps, step = 0,
                   at = 0, a = 0.002, d = 0.1, g = 0.2, punch = 1, vib, out = master }) {
    const o = ctx.createOscillator(), s = t0 + at, end = s + a + d + 0.02;
    if (duty) o.setPeriodicWave(pulseWave(duty)); else o.type = type;
    o.frequency.setValueAtTime(f * rate, s);
    if (steps) steps.forEach((fs, i) => o.frequency.setValueAtTime(fs * rate, s + i * step));
    else if (to !== f) o.frequency.exponentialRampToValueAtTime(to * rate, s + glide);
    if (vib) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = vib.rate; depth.gain.value = vib.depth * rate;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(s); lfo.stop(end);
    }
    o.connect(envelope(at, a, d, g, punch)).connect(out);
    o.start(s); o.stop(end);
  }

  // A noise burst. `stutter` jitters the gain every 10 ms for a crackle.
  function noise({ at = 0, a = 0.002, dur = 0.05, g = 0.2, stutter = false, out = master }) {
    const src = ctx.createBufferSource(), s = t0 + at;
    src.buffer = noiseBuf;
    const env = envelope(at, a, dur, g, 1);
    if (stutter) for (let t = a; t < dur; t += 0.01)
      env.gain.setValueAtTime(g * (0.15 + Math.random()) * (1 - t / dur), s + t);
    src.connect(env).connect(out);
    src.start(s, Math.random() * 0.5); src.stop(s + a + dur + 0.02);
  }

  const notes = (freqs, step, opts) => freqs.forEach((f, i) => voice({ ...opts, f, at: (opts.at || 0) + i * step }));

  // ---------- cues (art direction §6; asset-plan sfx descriptions) ----------

  const cues = {
    hop() { voice({ duty: 0.25, f: 520, to: 780, glide: 0.09, d: 0.12, g: 0.4 }); },

    land() {
      voice({ type: 'triangle', f: 180, to: 120, glide: 0.06, d: 0.08, g: 0.18 });
      noise({ dur: 0.04, g: 0.36, out: filter('bandpass', 900, { Q: 3 }) });
    },

    snap() {
      noise({ dur: 0.05, g: 0.2, out: filter('bandpass', 2500, { to: 1200, sweep: 0.05, Q: 1.5 }) });
      voice({ type: 'triangle', f: 1600, d: 0.03, g: 0.06 });
    },

    catch() { voice({ duty: 0.5, steps: [1050, 1400], f: 1050, step: 0.06, d: 0.24, g: 0.2, punch: 1.4 }); },

    golden() {
      const arp = [784, 988, 1175, 1568];
      arp.forEach((f, i) => {
        const last = i === arp.length - 1, at = i * 0.05, d = last ? 0.25 : 0.05;
        voice({ duty: 0.5, f, at, d, g: 0.2, punch: 1.3 });
        voice({ type: 'triangle', f: f / 2, at, d, g: 0.15 });
      });
    },

    combo() { notes([1320, 1760], 0.045, { type: 'triangle', d: 0.045, g: 0.2 }); },

    thaw() {
      noise({ dur: 0.12, g: 0.3, stutter: true, out: filter('highpass', 3000) });
      voice({ type: 'sine', f: 330, to: 440, glide: 0.15, a: 0.08, d: 0.12, g: 0.25 });
    },

    creak() {
      voice({ type: 'triangle', f: 110, d: 0.09, g: 0.12, vib: { rate: 23, depth: 6 } });
      noise({ dur: 0.05, g: 0.08, stutter: true, out: filter('highpass', 5000) });
    },

    freeze() {
      notes([880, 660, 440], 0.05, { type: 'triangle', d: 0.05, g: 0.1 });
      noise({ dur: 0.15, g: 0.08, stutter: true, out: filter('highpass', 4000) });
    },

    unfreeze() {
      voice({ type: 'sine', f: 600, to: 900, glide: 0.06, a: 0.005, d: 0.06, g: 0.12 });
      voice({ type: 'sine', f: 800, to: 1200, glide: 0.06, at: 0.07, a: 0.005, d: 0.06, g: 0.12 });
    },

    frozen() {
      const lp = filter('lowpass', 4000, { to: 800, sweep: 0.56, Q: 2 });
      notes([523, 392, 330, 262], 0.14, { type: 'triangle', d: 0.14, g: 0.3, out: lp });
      voice({ type: 'triangle', f: 262, at: 0.42, d: 0.5, g: 0.2, out: lp }); // let the last note ring
      noise({ a: 0.15, dur: 0.6, g: 0.06, out: filter('lowpass', 1200) });
    },

    dawn() {
      const chord = [523, 659, 784, 1047];
      notes(chord, 0.09, { duty: 0.5, d: 0.09, g: 0.15 });
      chord.forEach(f => {
        voice({ duty: 0.5, f, at: 0.36, a: 0.01, d: 0.6, g: 0.07 });
        voice({ type: 'triangle', f, at: 0.36, a: 0.01, d: 0.6, g: 0.07 });
      });
    },

    nope() {
      const lp = filter('lowpass', 900);
      [0, 0.1].forEach(at => voice({ duty: 0.5, f: 140, at, d: 0.06, g: 0.3, vib: { rate: 30, depth: 12 }, out: lp }));
    },

    expire() { voice({ type: 'sine', f: 1318, to: 660, glide: 0.25, a: 0.01, d: 0.28, g: 0.05 }); },

    spawn() { voice({ type: 'sine', f: 2093, a: 0.008, d: 0.3, g: 0.08 }); },

    click() { voice({ type: 'square', f: 1200, d: 0.04, g: 0.18, out: filter('highpass', 300) }); },
  };

  // ---------- context lifecycle ----------

  function unlock() {
    if (ctx) return;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    if (!paused) ctx.resume();
    GESTURES.forEach(e => root.removeEventListener(e, unlock, true));
  }

  const GESTURES = ['pointerdown', 'mousedown', 'keydown', 'touchstart'];
  if (root.addEventListener) GESTURES.forEach(e => root.addEventListener(e, unlock, true));

  const SFX = {
    names: Object.keys(cues),
    get muted() { return muted; },

    play(name, r = 1) {
      const cue = cues[name];
      if (!cue) { if (root.console) console.warn('SFX: unknown cue', name); return; }
      if (!ctx || paused || muted) return;
      t0 = ctx.currentTime + 0.005; rate = r;
      cue();
    },

    suspend() { paused = true; if (ctx) ctx.suspend(); },
    resume() { paused = false; if (ctx) ctx.resume(); },

    setMuted(on) {
      muted = !!on;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
    },
  };

  root.SFX = SFX;
  if (typeof module !== 'undefined' && module.exports) module.exports = SFX;
})(typeof window !== 'undefined' ? window : globalThis);
