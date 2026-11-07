// Seeded RNG (mulberry32) for all sim randomness, plus small math and hit-test helpers.
const Rng = {
  s: 1,
  base: 0,
  runs: 0,
  init() {
    const m = /[?&]seed=(\d+)/.exec(location.search);
    this.base = m ? (+m[1] >>> 0) : ((Math.random() * 4294967296) >>> 0);
  },
  reseed() { this.s = (this.base + 0x9e3779b9 * this.runs++) >>> 0; },
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  range(a, b) { return a + (b - a) * this.next(); },
  int(n) { return (this.next() * n) | 0; },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;

// Smallest signed difference between two angles, in [-PI, PI].
function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Squared distance from point (px,py) to segment (ax,ay)-(bx,by).
function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  const ex = ax + dx * t - px, ey = ay + dy * t - py;
  return ex * ex + ey * ey;
}

// Does segment (ax,ay)-(bx,by) touch the rect [x0,x1]x[y0,y1]? (slab test)
function segAabb(ax, ay, bx, by, x0, y0, x1, y1) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  if (Math.abs(dx) < 1e-9) { if (ax < x0 || ax > x1) return false; }
  else {
    let u = (x0 - ax) / dx, v = (x1 - ax) / dx;
    if (u > v) { const w = u; u = v; v = w; }
    if (u > t0) t0 = u; if (v < t1) t1 = v;
    if (t0 > t1) return false;
  }
  if (Math.abs(dy) < 1e-9) { if (ay < y0 || ay > y1) return false; }
  else {
    let u = (y0 - ay) / dy, v = (y1 - ay) / dy;
    if (u > v) { const w = u; u = v; v = w; }
    if (u > t0) t0 = u; if (v < t1) t1 = v;
    if (t0 > t1) return false;
  }
  return true;
}

// Is (x,y) inside the swipe sector centred on (px,py), angle ang, radius r (+pad)?
function inArc(px, py, ang, x, y, r, halfArc, pad) {
  const dx = x - px, dy = y - py;
  if (Math.sqrt(dx * dx + dy * dy) - pad > r) return false;
  return Math.abs(angleDiff(Math.atan2(dy, dx), ang)) <= halfArc;
}
