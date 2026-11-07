// CONFIG: every tunable number (GDD values), button rects and the event -> sfx cue map. Data only.
var CONFIG = {
  // Space and time
  W: 960, H: 540, CX: 480, CY: 290, POND_R: 260, SKY_H: 30,
  DT: 1 / 60, EPS: 1e-6, MAX_STEPS: 5, MAX_FRAME_S: 0.25,

  // Pads
  PAD_COUNT: 14, PAD_MIN_COUNT: 12, PAD0_R: 28, PAD_R_MIN: 22, PAD_R_MAX: 34,
  PAD_D_MIN: 60, PAD_EDGE: 40, PAD_GAP: 20, PAD_LINK_MIN: 70, PAD_LINK_MAX: 135,
  PAD_TRIES: 5000, PAD_RESEED: 7919, BOB_P_MIN: 6, BOB_P_MAX: 9,
  OMEGA: 0.045, BOB: 4,

  // Ice: v = ICE_V0 + ICE_ACC * t
  ICE_V0: 0.8, ICE_ACC: 0.012, TREND_N: 10,
  CAP_FALL: 0.25, // px/s the thaw cap falls from POND_R: 260 at dusk, 215 at dawn

  // Frog
  HOP_RANGE: 150, HOP_T: 0.35, CROUCH_STEPS: 2, LAND_T: 0.10, HOP_PEAK: 18, NOPE_T: 0.067,
  REACH: 90, FLY_HIT: 8, TONGUE_OUT: 0.10, TONGUE_BACK: 0.10, SNAP_CD: 0.35,
  WARN_MARGIN: 5, FROST_GRACE: 1.5, CREAK_MIN: 0.2, CREAK_SPAN: 0.4,

  // Scoring and warmth
  THAW: 3, THAW_GOLD: 10, PTS: 10, PTS_GOLD: 50, MIDHOP_MULT: 2, COMBO_T: 2.0, COMBO_MAX: 5,

  // Fireflies
  FLY_POOL: 8, MAX_FLIES: 5, SPAWN_T: 2.4, SPAWN_START: 6, SPAWN_EXCL: 120, SPAWN_TRIES: 8,
  SPAWN_EDGE: 12, SPAWN_PAD_CLEAR: 4,
  TAME_T: 0.5, TAME_D: 60, TAME_LEASH: 70, TEACH_N: 2, TEACH_D_MIN: 130, TEACH_D_MAX: 200, TEACH_CONE: 20 * Math.PI / 180,
  GOLD_FIRST: 22, GOLD_MIN: 15, GOLD_MAX: 25,
  SHY_AFTER: 3, FLY_SPEED: 30, GOLD_SPEED: 55, FLY_TURN: 3, SHY_R: 130, FLY_EDGE: 10,
  FLY_LIFE: 8, FLY_BLINK: 2, GOLD_LIFE: 4, GOLD_BLINK: 1.5, FADE_T: 0.3,

  // Night, rules, hints
  NIGHT: 180, DAWN_RAMP: 20, DAWN_BONUS: 500, RESTART_T: 0.8,
  HINT_MAX: 0.7, HINT_FADE: 0.5, HINT_HOP_T: 6,

  // Input
  CHORD_STEPS: 3, CONE_NARROW: 30 * Math.PI / 180, CONE_WIDE: 50 * Math.PI / 180,
  CLICK_FLY: 20, TOUCH_FLY: 28, CLICK_PAD: 8, TOUCH_PAD: 14,
  BTN_MUTE: { x: 864, y: 8, w: 40, h: 40 },
  BTN_PAUSE: { x: 912, y: 8, w: 40, h: 40 },

  // Art and sound
  SPRITE_SCALE: 2, SPRITE_SCALES: { frog: 3, firefly: 3, golden: 3 }, MISSING_COLOR: '#FF00FF', ASSET_TIMEOUT: 3000,
  EVENT_SFX: {
    hop: 'hop', land: 'land', snap: 'snap', catch: 'catch', goldenCatch: 'golden', thaw: 'thaw',
    combo: 'combo', spawn: 'spawn', expire: 'expire', nope: 'nope', padFreeze: 'freeze', padThaw: 'unfreeze',
    creak: 'creak', frozen: 'frozen', dawn: 'dawn', ui: 'click'
  },

  // localStorage keys
  KEY_BEST: 'lastLightPond.best', KEY_MUTE: 'lastLightPond.mute', KEY_RM: 'lastLightPond.rm'
};
