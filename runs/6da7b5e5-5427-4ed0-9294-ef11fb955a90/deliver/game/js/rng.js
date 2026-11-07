// mulberry32 PRNGs: rng drives gameplay, fxRng drives cosmetics, so juice never shifts the balance sequence.
const Rng = (() => {
  function make() {
    return {
      s: 0,
      seed(n) { this.s = n >>> 0; },
      next() {
        let a = (this.s = (this.s + 0x6D2B79F5) | 0);
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(lo, hi) { return lo + (hi - lo) * this.next(); },
      int(n) { return (this.next() * n) | 0; },
    };
  }
  const q = new URLSearchParams(location.search);
  const raw = q.get('seed');
  const urlSeed = raw !== null && raw !== '' && isFinite(+raw) ? (+raw >>> 0) : null;
  return {
    rng: make(), fxRng: make(), urlSeed,
    manual: q.get('manual') === '1',
    reseed(seed) { this.rng.seed(seed); this.fxRng.seed(seed ^ 0x9E3779B9); },
    nextSeed() { return urlSeed !== null ? urlSeed : (Date.now() >>> 0); },
  };
})();
const rng = Rng.rng, fxRng = Rng.fxRng;
