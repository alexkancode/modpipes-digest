// Main: fixed-timestep loop, state machine (title, play, pause, over), camera, perf, window.__game.
const Cam = {
  x: 0, px: 0,
  reset() { this.x = this.px = clamp(Monster.x - 320, 0, CONFIG.WORLD - CONFIG.W); },
  step() { this.px = this.x; this.x = clamp(this.x + (Monster.x - 320 - this.x) * 0.15, 0, CONFIG.WORLD - CONFIG.W); },
};

const Perf = {
  frames: 0, fps: 0, worstMs: 0, warmWorstMs: 0, stepMs: 0, longFrames: 0,
  ring: new Float32Array(120), sorted: new Float32Array(120), ri: 0, count: 0, sum: 0, last: -1, playFrames: 0,
  get p95Ms() {
    const n = this.count;
    if (!n) return 0;
    this.sorted.fill(0); this.sorted.set(this.ring);
    const s = this.sorted.subarray(0, 120).sort();
    return s[120 - n + Math.floor((n - 1) * 0.95)];
  },
  resync() { this.last = -1; },
  reset() {
    this.frames = 0; this.worstMs = 0; this.warmWorstMs = 0; this.playFrames = 0; this.longFrames = 0;
    this.ring.fill(0); this.ri = 0; this.count = 0; this.sum = 0; this.last = -1;
  },
  sample(now) {
    this.frames++;
    if (this.last < 0) { this.last = now; return; }
    const iv = now - this.last;
    this.last = now;
    this.sum += iv - this.ring[this.ri];
    this.ring[this.ri] = iv; this.ri = (this.ri + 1) % 120;
    if (this.count < 120) this.count++;
    this.fps = Math.round(10000 / (this.sum / this.count)) / 10;
    if (Main.state === 'play') {
      if (this.playFrames < 60) this.warmWorstMs = Math.max(this.warmWorstMs, iv);
      else this.worstMs = Math.max(this.worstMs, iv);
      this.playFrames++;
    }
  },
  stepCost(ms, n) { if (n > 0) this.stepMs = this.stepMs * 0.95 + (ms / n) * 0.05; },
  observe() {
    try {
      if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes &&
          PerformanceObserver.supportedEntryTypes.indexOf('long-animation-frame') >= 0) {
        new PerformanceObserver((l) => { if (Main.state === 'play') this.longFrames += l.getEntries().length; })
          .observe({ type: 'long-animation-frame', buffered: true });
      }
    } catch (e) { /* optional */ }
  },
};

const Main = {
  state: 'title', acc: 0, last: 0, resync: true,

  init() {
    Rng.init(); Rng.reseed();
    const canvas = document.getElementById('game');
    Assets.init();
    Snd.init();
    Fx.init(); City.init(); Army.init();
    Input.init(canvas);
    Render.init(canvas);
    City.reset(); Monster.reset(); Monster.x = Monster.px = 200; Cam.reset();
    Perf.observe();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'play') this.enterPause(); Snd.suspend(); }
      else { this.resync = true; Perf.resync(); }
    });
    window.addEventListener('blur', () => { if (this.state === 'play') this.enterPause(); Input.clearHeld(); });
    requestAnimationFrame((t) => this.frame(t));
  },

  resetRun() {
    Rng.reseed();
    Run.reset(); City.reset(); Monster.reset(); Army.reset(); Fx.reset(); Signs.reset();
    Input.clearPress(); Cam.reset(); Perf.reset();
    Render.gridFlash = 0;
  },

  enterPlay() {
    this.resetRun();
    Snd.unlock();
    Snd.play('ui'); Snd.play('roar');
    this.resync = true;
    this.state = 'play';
  },

  enterOver() {
    this.state = 'over';
    Run.overT = 0;
    Run.finish(Monster.killedBy === SRC_DRAIN);
    Fx.slowmo(CONFIG.fx.slowmo);
    Snd.play('roar');
    Render.bakeCard();
  },

  enterPause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    Input.clearHeld();
    Snd.suspend();
  },

  leavePause() {
    this.state = 'play';
    Snd.resume(); Snd.play('ui');
    this.resync = true;
  },

  step(dt) {
    Input.toIntents();
    Run.t += dt;
    Monster.drain(dt);
    Monster.step(dt);
    City.step(dt);
    Army.step(dt);
    Run.step(dt);
    Signs.step(dt);
    Fx.step(dt);
    Cam.step();
    if (Monster.hp <= 0) this.enterOver();
    Snd.endTick();
  },

  stepOver(dt) {
    Monster.stepDead(dt);
    Fx.step(dt);
    Run.overT += dt;
    Snd.endTick();
  },

  // menu input: title, over and pause react to presses here (pause has no sim step)
  handleMenus() {
    const p = Input.press;
    if (p.pause) {
      if (this.state === 'play') this.enterPause();
      else if (this.state === 'pause') this.leavePause();
    }
    if (this.state === 'title' && p.any) this.enterPlay();
    else if (this.state === 'over' && Run.overT >= 1.65 && (p.any)) this.enterPlay();
    p.pause = false; p.any = false;
    if (this.state !== 'play') { p.stomp = p.swipe = p.beam = false; }
  },

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    if (this.resync) { this.last = now; this.acc = 0; this.resync = false; Perf.resync(); }
    const realMs = Math.min(now - this.last, 250);
    this.last = now;
    Perf.sample(now);
    Fx.stepReal(realMs, now);
    this.handleMenus();
    const DT = CONFIG.DT, st = this.state;
    if (st === 'play' || st === 'over') {
      if (Fx.hitstopMs > 0 && st === 'play') Fx.stepFrozen(realMs / 1000);
      else {
        this.acc += realMs / 1000 * Fx.timeScale;
        let n = 0;
        const t0 = performance.now();
        while (this.acc >= DT && n < 5) {
          if (this.state === 'play') this.step(DT); else this.stepOver(DT);
          this.acc -= DT; n++;
        }
        if (n === 5) this.acc = 0;
        Perf.stepCost(performance.now() - t0, n);
      }
    } else if (st === 'title') {
      Render.titleT += realMs / 1000;
      Monster.life += realMs / 1000; Monster.stepBlink(realMs / 1000);
    }
    const s = this.state;
    Render.frame(s === 'play' || s === 'over' ? this.acc / DT : 1, s);
  },
};

const debug = Object.defineProperties({}, {
  hp: { get: () => Monster.hp, enumerable: true },
  t: { get: () => Run.t, enumerable: true },
  combo: { get: () => Run.combo, enumerable: true },
  units: { get: () => Army.alive, enumerable: true },
  buildingsStanding: { get: () => City.countStanding(), enumerable: true },
});

window.__game = {
  start() { Main.enterPlay(); },
  get state() { return Main.state; },
  get score() { return Run.score; },
  perf: Perf,
  debug,
};

Main.init();
