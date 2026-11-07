// Every tunable number lives here (GDD is final on values). Logic files never hold literals for balance.
const DEG = Math.PI / 180;

const CONFIG = {
  W: 640, H: 360, WORLD: 1280, GROUND: 300, DT: 1 / 60,
  monster: {
    hpStart: 80, hpMax: 100, drain: 4, speed: 90, xMin: 60, xMax: 1220, startX: 260,
    hurtT: 0.08, hurtGap: 0.34, knock: 2, lowBonusBelow: 25, lowBonus: 1.25, heartbeatBelow: 30,
    boxHalfW: 35, boxTop: 160, deathFall: 0.8,
    followStart: 64, followStop: 24, // r1: walk toward the cursor past 64px, stop within 24px (hysteresis)
  },
  stomp: { windup: 0.14, impact: 0.10, recover: 0.10, cooldown: 0.5, radius: 140, shake: 12, whiffShake: 6, hitstop: 60, footOff: 20, ringDur: 0.30 },
  swipe: {
    windup: 0.08, strike: 0.12, recover: 0.15, cooldown: 0.45,
    reach: 210, // polish r1: 220 -> 210 (bots outlived the 2-5 min window)
    halfArc: 50 * DEG, smearIn: 70, signSlack: 60, shoulderOff: 20, shoulderY: 200, shake: 3, hitstop: 40,
  },
  beam: {
    charge: 0.25, fire: 0.35, recover: 0.15,
    cooldown: 1.8, // polish r1: 1.5 -> 1.8 (same reason)
    length: 700, half: 7, mouthOff: 34, mouthY: 160, rumble: 2,
  },
  city: {
    lots: 10, first: 64, pitch: 128, hp: 3, wMin: 72, wMax: 110, hMin: 90, hMax: 200,
    powerW: [72, 84], powerH: [160, 200], shapes: 12, powerShapes: 2, powerChance: 1 / 6,
    collapse: 0.4, regrowAfter: 8, regrowDist: 200, regrowT: 0.5,
    pullRange: 320, pullMin: 3, pullClear: 20, shardKillPad: 30, pad: 12,
  },
  army: {
    pool: 64, cap: 40, projPool: 128, unitR: 14,
    tank: { hp: 2, speed: 40, rookieSpeed: 25, standoff: [200, 340], reclose: 40, firstShot: 1.5, rookieFirst: 2.0, reload: 3.0, telegraph: 0.4, flight: 1.1, g: 400, dmg: 6, dmgStart: 4, dmgRamp: 75, rookieDmg: 1, dieT: 0.3 },
    heli: { hp: 1, speed: 70, y: [80, 180], standoff: [180, 320], band: 20, bob: 4, firstBurst: 1.5, reload: 2.5, telegraph: 0.4, rounds: 3, roundGap: 0.1, bulletSpeed: 260, dmg: 2, dmgStart: 1.5, dmgRamp: 75, dieT: 0.6 },
    // shot damage ramps dmgStart -> dmg over dmgRamp s (polish r3: novice cliff); bible fixes spawns, drain, heals only
    aimY: 230, rookies: 3, rookieFarStandoff: 330,
  },
  spawn: { start: 3, base: 0.6, ramp: 0.01, cap: 3.0, heliFrom: 12, heliChance: 0.35, edge: 30,
    breathStart: 45, breathEvery: 45, surge: 4, surgeMul: 1.8, lull: 4, lullMul: 0.4 },
  // index = kind: 0 building, 1 power tower, 2 tank, 3 heli
  score: { perSec: 100, // polish r2: 10 -> 100 so survival is ~15-25 % of a run's score
     points: [100, 200, 50, 50], comboWindow: 2.0, comboShrink: 0.2, comboMax: 5, roarGap: 10 },
  heal: [10, 20, 8, 8], // GDD lever order if runs end < 60 s: building 10 -> 14, then units 8 -> 10
  fx: {
    particles: 200, rings: 6, popups: 6, healFlies: 4,
    hitstopCap: 150, shakeCap: 20, shakeDecay: 0.86, slowmo: 250, slowmoScale: 0.3,
    collapseHitstop: 80, collapseHitstopCombo: 100, collapseShake: 6, collapseRing: 90, powerRing: 160,
    popupRise: 20, healFlyDx: -26, healFlyDy: 16, healMergeT: 0.1, popupT: 0.6, popupMinY: 44, healFlyT: 0.35, comboBumpT: 0.1, deathShake: 16,
  },
  hud: { barX: 30, barY: 12, barW: 160, barH: 12, ringX: 210, ringXLow: 232, ringY: 18, ringR: 9 },
};

const PAL = {
  night: '#0b0720', face: '#140c33', grid: '#2a1b5e', lime: '#6dff6d', limeDim: '#3a9a3a',
  cyan: '#19f0ff', cyanDim: '#0f8fa8', mag: '#ff2bd6', magDim: '#b0189a', yellow: '#fff04a',
  white: '#ffffff', dust: '#8a7fc0',
};
// Particle colour indices (Fx col array)
const PCOL = [PAL.cyan, PAL.yellow, PAL.white, PAL.lime, PAL.mag, PAL.dust];
const C_CYAN = 0, C_YELLOW = 1, C_WHITE = 2, C_LIME = 3, C_MAG = 4, C_DUST = 5;

// Asset-plan sprite names the code draws, each with how it falls back when its PNG is missing.
// 'rig' = code-drawn monster, 'box' = visible X placeholder, other values = code-drawn stand-in.
const SPRITE_NEEDS = {
  monster_idle: 'rig', monster_walk: 'rig', monster_stomp: 'rig', monster_swipe: 'rig',
  monster_beam: 'rig', monster_dead: 'rig',
  tank: 'box', tank_barrel: 'box', heli: 'box', antenna: 'box', rubble: 'rubble',
  glyph_signs: 'signs', crosshair: 'crosshair', icon_heart: 'box', logo: 'logo', touch_buttons: 'box',
};

const WHIFF_SND = { gain: 0.5 }; // a stomp that hits nothing thuds at half gain (asset plan)

// Game cue -> sfx names, first present wins.
const SFX_CUES = {
  stomp: ['stomp'], crumble: ['crumble', 'collapse'], crack: ['crack', 'crumble'], swipe: ['swipe'],
  swipe_hit: ['swipe_hit', 'swipeHit'], beam_charge: ['beam_charge', 'beamCharge'], beam: ['beam'],
  roar: ['roar'], tank_shot: ['tank_shot', 'tankShot'], heli_shot: ['heli_shot', 'heliShot'],
  unit_die: ['unit_die', 'unitBoom', 'unit_boom'], hurt: ['hurt'], combo: ['combo'], heal: ['heal'],
  heartbeat: ['heartbeat', 'lowHealth'], siren: ['siren'], step: ['step'], ui: ['ui', 'uiClick'],
};
