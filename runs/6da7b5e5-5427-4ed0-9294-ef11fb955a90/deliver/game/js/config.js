// Every tunable number lives here (tech plan §3). Logic files read CFG only.
const CFG = {
  W: 640, H: 360, pond: { cx: 320, cy: 188, a: 300, b: 165 },
  R0: 0.80, Rcap: 0.80,   // polish r3: wider ice from second 0; warmth can't pass the start, so outer pads frost ~20 s even in skilled play
  Rfloor: 0.10, shrinkBase: 0.0075, shrinkPerSec: 0.0001,
  melt: 0.018, meltGolden: 0.054, iceEase: 0.25,   // polish r3: mirror bot: skilled wins ~1:51, casual 3/6, novice freezes ~1:43 (all inside the 120 s harness cap)
  gustTimes: [40, 85, 130],   // polish r2: winners now meet two gust+swarm beats
  gustLen: 4, gustMult: 2, swarmDelay: 4, swarmCount: 6, swarmLife: 8, swarmFade: 1.5, swarmEnter: 1,
  padR: 22, padHitMinScreen: 22, padSpeed: [8, 20], padOrbit: [6, 12], centreOrbit: 4, centreSpeed: 4,
  padAnchors: [[0,0],[75,40],[-75,40],[75,-40],[-75,-40],[190,0],[-190,0],[110,100],[-110,100],[110,-100],[-110,-100]],
  frostWarnSec: 1.5, frostMinDwell: 1.5, thawHyst: 0.02, thawAnim: 0.3,
  hopRange: 130, hopTime: 0.35, hopApex: 18, hopBuffer: 0.12, keyCone: Math.PI / 4,
  tongueRange: 90, tongueOut: 0.09, tongueBack: 0.09, tongueTip: 12, tongueCooldown: 0.25, swallow: 1.0, thawSfxDelay: 0.06, iceHintAt: 3, tongueBuffer: 0.12, clickFlyR: 20,
  flyPool: 20, capByTime: [[0,7]], respawn: 0.7, respawnSubsidy: 0.7, flyLife: 6, flyEnter: 1.0, flyEnterRho: 1.08,   // polish r2: plentiful flies (3+ on screen ~96% of the time); the swallow pause caps the catch rate instead
  spawnRhoMargin: 0.05, spawnNearPad: 70, spawnMinFrog: 60, spawnMinFrogInitial: 95, spawnMinFrogSubsidy: 30,
  spawnInitialNearInner: 2, spawnInitialNearDist: 40, spawnAttempts: 12,
  wander: [[0,10],[20,10],[60,18],[120,25]], wanderReach: 60, wanderRetarget: [2, 4], bobAmp: 3, bobHz: 1.5, iceAvoid: 0.04,
  blinkPeriod: [1.2, 2.0], blinkLit: 0.65, blinkFade: 0.1, spawnFade: 0.3,
  goldenAfter: 45, goldenOdds: 12, goldenLife: 8, goldenBlinkLast: 2, goldenSpeed: 1.5, goldenHoldRho: 0.06,
  baseFly: 10, baseGolden: 50, streakStep: 5, streakCap: 10, streakTimeout: 4, midHopMult: 2,
  winBonusBase: 100, winBonusPerTenth: 30,   // polish r2: was 500+100/tenth (~1500), which swamped the catch score
  jarTarget: 80, goldenJar: 3,
  winSeq: 1.5, loseSeq: 0.8, overInputLock: 0.4, hitstopGoldenSteps: 3, hitstopMidHopSteps: 2, hitstopCatchSteps: 1,
  shakeMax: 4, shakeDecay: 2.0, shakeGust: 0.5, shakeLose: 0.6, shakeCatch: 0.5, shakeMidHop: 0.72, shakeGolden: 0.8,   // trauma²×4 px: catch 1, mid-hop 2, golden 2.6 shiverBelowR: 0.30, dangerBelowR: 0.30,
  pools: { particles: 128, ripples: 16, floats: 16 },
  iceFingers: 48, iceCreepRate: 0.0006, iceCreepMax: 0.03,   // fingers lengthen with time (cosmetic), so frost visibly creeps even at full warmth
  iceRebakeDR: 0.004, iceRebakeSec: 0.25, iceCrawl: 0.2,
  labelLife: 1.2, floatLife: 0.6, floatRise: 16,
  bestKey: 'lastLightPond.best', muteKey: 'lastLightPond.muted',
};

// GDD roles are the defaults; ASSET_PLAN.palette overrides them at boot (Assets.boot).
const PALETTE = {
  water: '#1E4A55', deepWater: '#12303A', pad: '#4E9A3A', frog: '#7CC243', firefly: '#FFC94A', golden: '#FFF27A',
  ice: '#DDF1F7', iceShadow: '#9CC6D6', shore: '#1A2A1E', text: '#F4EBD0', tongue: '#E06A7A',
  ink: '#0B1620', padLight: '#78C266', padFrozen: '#CFE6EE', frogBelly: '#F3EFC8', padShadow: '#24603A',
  ripple: '#24506A', reed: '#2C4630', fireflyGlow: '#FFC23A', fireflyDim: '#8A7A3A', iceEdge: '#7FB3C8', danger: '#FF8A5C',
};
const PALETTE_ALIAS = { water_deep: 'deepWater', frost_edge: 'iceEdge', pad_light: 'padLight', pad_frozen: 'padFrozen', frog_belly: 'frogBelly' };

// Sprite needs, keyed and ordered exactly as asset-plan.json names them (draw size = plan size, 1 art px = 1 logical px).
const SPRITE_NEEDS = {
  frog:      { w: 32, h: 32, frames: ['idle','puff','crouch','air','tongue','frozen','dive'] },
  pad:       { w: 48, h: 48, frames: ['open','frosting','frozen'] },
  firefly:   { w: 8,  h: 8,  frames: ['lit','dim'] },
  golden:    { w: 12, h: 12, frames: ['a','b'] },
  jar:       { w: 20, h: 28, frames: ['jar'] },
  snowflake: { w: 12, h: 12, frames: ['whole','cracked'] },
  chevron:   { w: 8,  h: 8,  frames: ['up','right','down','left'] },
  mute:      { w: 12, h: 12, frames: ['on','muted'] },
  reeds:     { w: 24, h: 40, frames: ['left','right'] },
};
const ART_ALIAS = {};   // code key -> plan sprite name, when they differ
const FRAME_MAP = {};   // code key -> [plan frame index per code frame], when orders differ
const SFX_ALIAS = {};   // GDD cue -> plan cue, when they differ (plan uses the GDD's 12 names)

const FROG_F = { idle: 0, puff: 1, crouch: 2, air: 3, tongue: 4, frozen: 5, dive: 6 };
const PAD_F = { open: 0, frosting: 1, frozen: 2 };
const PAD_OPEN = 0, PAD_FROSTING = 1, PAD_FROZEN = 2, PAD_THAWING = 3;
const PAD_STATE_NAMES = ['open', 'frosting', 'frozen', 'thawing'];
const FROG_IDLE = 0, FROG_AIR = 1, FROG_FROZEN = 2, FROG_DIVE = 3;
const T_READY = 0, T_OUT = 1, T_BACK = 2, T_COOL = 3;
