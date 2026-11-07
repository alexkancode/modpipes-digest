// Audio: thin guard over the global SFX from assets/sfx.js. Resolves cue aliases once,
// plays each cue at most once per sim tick, never throws, and stays silent if SFX is absent.
const Snd = {
  names: {}, idx: {}, last: null, tick: 1, muted: false, warned: {},

  init() {
    const keys = Object.keys(SFX_CUES);
    this.last = new Uint32Array(keys.length);
    for (let i = 0; i < keys.length; i++) this.idx[keys[i]] = i;
    this.resolve();
  },

  resolve() {
    const avail = {};
    const plan = Assets.plan.sfx || [];
    for (let i = 0; i < plan.length; i++) avail[plan[i].name] = true;
    if (!plan.length && window.SFX) for (const n in window.SFX) if (typeof window.SFX[n] !== 'function') avail[n] = true;
    for (const cue in SFX_CUES) {
      const al = SFX_CUES[cue];
      let pick = al[0];
      for (let i = 0; i < al.length; i++) if (avail[al[i]]) { pick = al[i]; break; }
      this.names[cue] = pick;
    }
  },

  play(cue, arg) {
    const S = window.SFX;
    if (this.muted || !S || typeof S.play !== 'function') return;
    const i = this.idx[cue];
    if (i === undefined || this.last[i] === this.tick) return;
    this.last[i] = this.tick;
    try { S.play(this.names[cue], arg); }
    catch (e) { if (!this.warned[cue]) { this.warned[cue] = true; console.warn('[audio] cue failed:', cue, e && e.message); } }
  },

  endTick() { this.tick++; },

  call(m) {
    const S = window.SFX;
    if (!S) return;
    try {
      if (m === 'unlock') {
        if (S.unlock) S.unlock();
        else if (S.ctx && S.ctx.resume) S.ctx.resume();
        else if (S.resume) S.resume();
      } else if (S[m]) S[m]();
      else if (S.ctx && S.ctx[m]) S.ctx[m]();
    } catch (e) { /* audio is optional */ }
  },
  unlock() { this.call('unlock'); },
  suspend() { this.call('suspend'); },
  resume() { this.call('resume'); },

  toggleMute() {
    this.muted = !this.muted;
    const S = window.SFX;
    try { if (S && S.setMuted) S.setMuted(this.muted); else if (S && S.mute) S.mute(this.muted); } catch (e) { /* optional */ }
  },
};
