// CFG: every design number (GDD §2, §5), UI rects and key map (tech plan §12.1).
// Units: px, px/s, seconds, unless a name ends in "Steps".
var CFG = (function () {
  return {
    DT: 1 / 60, W: 640, H: 360, TILE: 16, ROWS: 23, GROUND_ROW: 19,
    CAM_Y: 8, CAM_LEAD: 32, CAM_LERP: 0.12, CAM_OFFSET: 256,
    PAR_SECONDS: 240, PORTALS: 3, START_X: 64,

    PLAYER: {
      w: 20, h: 52, hpMax: 100, hpStart: 80,
      speed: 160, accel: 1200, decel: 1600, slipDecel: 0.6, airMul: 0.8,
      gUp: 1100, gDown: 1500, terminal: 520, jumpV: 398, cutMul: 0.5,
      coyoteSteps: 5, bufferSteps: 6,
      rollT: 0.35, rollSpeed: 257, rollIframes: 0.25, rollCd: 0.8,
      hurtT: 0.15, castT: 0.2, pitDamage: 10, respawnIframes: 1.0
    },
    MELEE: { dmg: [10, 10, 18], dur: 0.30, activeFrom: 0.08, activeTo: 0.16, w: 36, h: 40, buffer: 0.25, knock: 120, moveMul: 0.3 },
    SPARK: { dmg: 8, cd: 0.45, speed: 320, life: 1.2, wobble: 4, wobbleHz: 6, pierce: 1, w: 16, h: 10 },
    FLASK: { start: 2, max: 3, heal: 40, first: 10, dur: 0.5, killsPerCharge: 5 },
    COMPOSURE: {
      max: 100, stashBonus: 5, regen: 6, regenDelay: 3, drain: 30,
      flusterT: 1.0, presses: 5, pressesLow: 4, pressesTeach: 3, teachCharms: 3, lowAt: 30, escapeBonus: 5,
      iframes: 1.5, mercy: 3, swoonDmg: 20, swoonReset: 60, swoonFlash: 0.4, tea: 25
    },
    ACID: { dmg: 6, tick: 0.5 },
    PLATE: { dmg: 12, armed: 0.7, tell: 0.6, active: 0.2, w: 32, h: 8 },

    ENEMY: {
      grunt: { hp: 20, w: 22, h: 40, speed: 70, aggro: 220, dmg: 10, cd: 1.4, reach: 40, tell: 0.45, active: 0.12, recover: 0.4, winkChance: 0.15, winkRange: 48 },
      caster: { hp: 15, w: 20, h: 40, speed: 60, aggro: 320, keepMin: 160, keepMax: 220, dmg: 8, cd: 2.0, tell: 0.5, projSpeed: 160, kissSpeed: 140, kissEvery: 3, kissFromLevel: 3, recover: 0.3 },
      elite: { hp: 60, w: 32, h: 48, speed: 90, aggro: 260, chargeDmg: 18, chargeSpeed: 240, chargeT: 0.5, chargeTell: 0.5, chargeRange: 200, chargeCd: 2.0, lineR: 64, lineCd: 4, lineTell: 0.6, recover: 0.5 },
      choir: { hp: 15, w: 20, h: 40, speed: 50, aggro: 640, keepMin: 140, keepMax: 260, dmg: 0, cd: 2.4, tell: 0.5, projSpeed: 140, kissSpeed: 140, kissEvery: 1, kissFromLevel: 1, recover: 0.3 },
      maxAttackers: [2, 2, 3, 3, 3], hitstun: 0.2, hitstunCd: 0.6, flash: 0.034, gravity: 1500
    },
    LEVEL_MULT: { hp: [1, 1.25, 1.5, 1.75, 2], dmg: [1, 1.15, 1.3, 1.45, 1.6] },

    BOSS: {
      gravity: 1500, introT: 1.0, phaseT: 1.5,
      hillock: { hp: 600, w: 64, h: 88, speed: 60, idle: [0.8, 1.3], club: { dmg: 12, tell: 0.5, reach: 76, active: 0.35 }, hug: { tell: 0.6, tell2: 0.45, speed: 260, dist: 200 }, phase2At: 0.5 },
      brutus: { hp: 800, w: 72, h: 100, speed: 50, idle: [0.7, 1.2], wave: { dmg: 15, tell: 0.6, speed: 200, w: 32, h: 24, pairGap: 0.5 }, barbell: { dmg: 15, tell: 0.5, flight: 0.9, gravity: 900 }, spot: { tell: 0.5, r: 120 }, phase2At: 0.5 },
      dominus: { hp: 900, w: 48, h: 96, speed: 70, hover: 8, keep: 170, idle: [0.7, 1.2], volley: { n: 3, n2: 5, spread: 0.26, speed: 180, dmg: 8, tell: 0.5 }, pillar: { dmg: 14, tell: 0.7, active: 0.4, w: 24, h: 112 }, nova: { dmg: 14, tell: 0.8, r: 150 }, choir: 2, choirEvery: 9, stripT: 2, phase2At: 0.5 },
      piety: { hp: 500, w: 28, h: 64, speed: 70, keep: 150, idle: [0.7, 1.1], lob: { tell: 0.5, flight: 0.8, gravity: 900, puddleT: 3, puddleW: 48 }, wink: { tell: 0.5, r: 160 } },
      heart: { hp: 600, w: 80, h: 80, hover: 16, idle: [1.4, 1.4], ring: { tell: 0.6, speed: 240, rMax: 320, dmg: 16, band: 12 }, acidW: 64, acidH: 24 },
      kitava: { hp: 1600, w: 96, h: 120, speed: 40, idle: [0.6, 1.0], fork: { dmg: 25, tell: 0.7, reach: 100, active: 0.4 }, devour: { tell: 0.6, pull: 60, dur: 1.5 }, belch: { dmg: 30, tell: 0.8, every: 3 }, feastAt: [0.66, 0.33], feastT: 1.2 }
    },
    HITSTOP: { melee: 4, spark: 2, boss: 6, defeat: 18 },
    DEFEAT_LOOT_T: 2.0, CUTSCENE_T: 3.0, CUTSCENE_SLAM_AT: 1.0, CUTSCENE_RULE3: 1.2,
    DEATH_ANIM_T: 0.6, DEATH_POST_T: 1.5, BANNER_T: 2.5, POPUP_T: 2.5,
    WAVE_GAP: 1.5, WAVE_GROUP: 3, WAVE_NEXT: 1.0, ARENA_COLS: 40, ARENA_TRIGGER: 48, BOSS_TRIGGER: 80,
    GAG_RANGE: 48, BUBBLE_HOLD: 2.0, REPLY_DELAY: 1.4, OVER_INPUT_DELAY: 0.5,

    LOOT: {
      common: { chaos: 0.35 },
      elite: { chaos: 1, exalt: 0.08, vaal: 0.04, tailor: 0.08 },
      divine: 0.005, pityS: 90, magnetR: 40, magnetSpeed: 300, oohCd: 4,
      boss: { chaos: 5, exalt: 2, vaal: 1 }, dropVy: -200, dropVx: 60, gravity: 900, w: 12, h: 12
    },
    VALUE: { chaos: 1, tailor: 2, vaal: 3, exalt: 5, divine: 15 },
    TIER: { chaos: 0, tailor: 1, vaal: 2, exalt: 3, divine: 4 },

    // Patch notes by id 1..9 (GDD §2.8). Missing keys mean 0.
    PATCH: [
      null,
      { sparkMul: 0.3, flaskMax: -1 },
      { meleeMul: 0.25, rollCd: 0.2 },
      { hpMax: 20, regen: -2 },
      { flaskHeal: 15, sparkCdAdd: 0.1 },
      { mashLess: 1, speed: -10 },
      { portals: 1, dropMul: -0.1 },
      {}, {}, {}
    ],
    // Crafting affixes at T1; tiers scale by TIER_MUL.
    AFFIX: [
      { key: 'meleeMul', v: 0.2 }, { key: 'sparkMul', v: 0.15 }, { key: 'sparkCdMul', v: -0.15 },
      { key: 'hpMax', v: 15 }, { key: 'leech', v: 0.1 }, { key: 'flaskMax', v: 1, int: 1 },
      { key: 'speed', v: 10 }, { key: 'charmReduce', v: 0.2 }
    ],
    TIER_MUL: [0, 1, 1.5, 2],
    STASH: { bank: 0.1, hat: 100, composure: 250 },

    POOL: { enemies: 48, projectiles: 64, pickups: 64, hazards: 32, gags: 16, bubbles: 6, glyphs: 8, checkpoints: 8, gates: 6, obscure: 3 },

    // e.code → verb or verbs. Space doubles as confirm, Digit1 as flask and card 1.
    KEYS: {
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
      Space: ['jump', 'confirm'], KeyW: 'jump', ArrowUp: ['jump', 'up'], ArrowDown: 'down', KeyS: 'down',
      KeyJ: 'melee', KeyK: 'spark', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyL: 'dodge',
      KeyQ: 'flask', Digit1: ['flask', 'card1'], Digit2: 'card2', Digit3: 'card3',
      Escape: 'pause', KeyP: 'pause', Enter: 'confirm', NumpadEnter: 'confirm',
      KeyC: 'craftChaos', KeyE: 'craftExalt', KeyV: 'craftVaal', KeyX: 'craftDivine', KeyM: 'craftMirror'
    },
    PREVENT: { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, ShiftLeft: 1, ShiftRight: 1, Tab: 1, Escape: 1 },
    VERBS: ['left', 'right', 'up', 'down', 'jump', 'melee', 'spark', 'dodge', 'flask', 'pause', 'confirm', 'click',
      'card1', 'card2', 'card3', 'craftChaos', 'craftExalt', 'craftVaal', 'craftDivine', 'craftMirror'],

    UI: {
      cards: [{ x: 40, y: 56, w: 176, h: 128 }, { x: 232, y: 56, w: 176, h: 128 }, { x: 424, y: 56, w: 176, h: 128 }],
      craft: [{ x: 40, y: 216, w: 96, h: 28 }, { x: 144, y: 216, w: 96, h: 28 }, { x: 248, y: 216, w: 96, h: 28 }, { x: 352, y: 216, w: 96, h: 28 }, { x: 456, y: 216, w: 96, h: 28 }],
      craftOrbs: ['chaos', 'exalt', 'vaal', 'divine', 'mirror'],
      cont: { x: 488, y: 316, w: 112, h: 28 },
      pause: [{ x: 248, y: 150, w: 144, h: 24 }, { x: 248, y: 182, w: 144, h: 24 }, { x: 248, y: 214, w: 144, h: 24 }],
      over: { x: 248, y: 284, w: 144, h: 28 },
      touch: {
        r: 28, deadzone: 12, upAt: 24,
        buttons: [
          { verb: 'jump', x: 580, y: 316 }, { verb: 'melee', x: 520, y: 324 }, { verb: 'spark', x: 580, y: 252 },
          { verb: 'dodge', x: 520, y: 264 }, { verb: 'flask', x: 460, y: 324 }
        ],
        pause: { x: 604, y: 8, w: 28, h: 28 }
      }
    },
    HIDEOUT_FOCUS_CONTINUE: 8, WHISPER_MIN: 6, WHISPER_MAX: 10, WHISPER_T: 3, MSG_T: 2.5,

    LEVEL_TINT: ['#2E5E5C', '#7A4630', '#5A5034', '#6E3448', '#6A2430'],
    ELEMENT: { phys: 0, fire: 1, cold: 2, lightning: 3, charm: 4 },
    // probe bossAttack ids
    ATK: { none: 0, slam: 1, charm: 2, shockwave: 3, barbell: 4, volley: 5, pillar: 6, nova: 7, lob: 8, ring: 9, belch: 10, feast: 11, lunge: 12 }
  };
})();
