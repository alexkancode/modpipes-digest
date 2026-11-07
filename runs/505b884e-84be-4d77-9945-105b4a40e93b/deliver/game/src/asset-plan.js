// Mirror of assets/asset-plan.json for file:// (no fetch). Regenerate when the JSON changes.
window.ASSET_PLAN = {
  "notes": "Logical canvas 640x360, ground y=300. Sprites at 1:1 logical size, frames left to right in one strip, transparent background, glow baked in (6px stroke at 22% alpha under a 2px full-alpha outline), opaque #0b0720 fills. All sprites face RIGHT; code mirrors with x' = w - x. Anchors and per-frame points are in frame pixels. Buildings, beam, swipe trail, rings, particles, shells, bullets, popups and the HUD bars are drawn in code (see art-direction.md sections 2 and 5).",
  "sprites": [
    {
      "name": "monster_idle", "file": "monster_idle.png", "w": 192, "h": 176, "frames": 3,
      "anchor": [96, 170],
      "description": "The player monster at rest. Original bipedal beast, 150 px tall from the feet (y=170) to the horn tips (y=20), about 90 px wide including the tail; body centre x=96, faces right. Hunched, heavy, low centre of gravity. Horned wedge head pushed forward, FOUR eyes in a 2x2 diamond (3x3 lime dots with a 1px white centre), long forearms hanging to the knees ending in three claws, a thick tail tapering back to the ground with small spikes on the tail only. NO dorsal plates. Fill #0b0720, 2px #6dff6d outline plus baked glow, inner detail lines (belly plates, mouth line, claw joints) 1px lime at 60% alpha, a 10px lime ring on the chest (the beam core). Frame 0: tail swung down-left. Frame 1: tail swung 6px higher (sway). Frame 2: same as frame 0 with the eyes closed (blink).",
      "shoulder": [116, 70], "mouth": [136, 30]
    },
    {
      "name": "monster_walk", "file": "monster_walk.png", "w": 192, "h": 176, "frames": 4,
      "anchor": [96, 170],
      "description": "Walk cycle, same monster and style as monster_idle. Frame 0: contact, right (front) leg forward, left back, arms swinging opposite, tail swung up. Frame 1: passing, legs together, front foot lifted 6px. Frame 2: contact, left leg forward, right back, tail swung down. Frame 3: passing, back foot lifted 6px. Steps of at least 12px leg travel so the cycle reads at 640x360. Code adds the 3px bob on frames 0 and 2.",
      "foot": [[124, 170], [108, 164], [72, 170], [88, 164]]
    },
    {
      "name": "monster_stomp", "file": "monster_stomp.png", "w": 192, "h": 176, "frames": 3,
      "anchor": [96, 170],
      "description": "Stomp, same monster and style. Frame 0: wind-up, front (right) leg raised so the foot is 26px off the ground with the knee high, body leaning back 4 degrees, arms raised out for balance, mouth slightly open. Frame 1: impact, front foot planted at x=124, both knees bent, arms flung down and out, claws spread, jaw open. Frame 2: recover, nearly upright, arms and tail still trailing behind the motion (follow-through). Code applies stretch on frame 0 and a 6% squash on frame 1.",
      "foot": [[124, 144], [124, 170], [124, 170]]
    },
    {
      "name": "monster_swipe", "file": "monster_swipe.png", "w": 192, "h": 176, "frames": 4,
      "anchor": [96, 170],
      "description": "Swipe, same monster and style. Frame 0: cock, the front arm drawn back behind the head about 30 degrees, torso twisted away, claws curled. Frame 1: strike-high, the arm fully extended forward and up (about 30 degrees above horizontal) reaching out to x=184, three claws spread wide, torso turned into it. Frame 2: strike-low, the same but the arm extended forward and down (about 30 degrees below horizontal). Frame 3: follow-through, the arm swept past and across the body, torso over-rotated, the tail swinging opposite. The code draws the 220px trail from the shoulder.",
      "shoulder": [116, 70]
    },
    {
      "name": "monster_beam", "file": "monster_beam.png", "w": 192, "h": 176, "frames": 7,
      "anchor": [96, 170],
      "description": "Breath beam, same monster and style. Three aims, each a charge/fire pair, then a recover frame. Frame 0: charge-high, the head tilted up 30 degrees, jaw half open, body reared up, chest ring drawn thicker (2px). Frame 1: fire-high, the head up 30 degrees, jaw wide open, body leaning back. Frame 2: charge-mid, the head level. Frame 3: fire-mid, the head level, jaw wide. Frame 4: charge-low, the head tilted down 30 degrees. Frame 5: fire-low, the head down 30 degrees, jaw wide. Frame 6: recover, the head dropping, jaw closing. No beam is drawn in the sprite; the code draws the beam from the mouth point.",
      "mouth": [[132, 22], [134, 20], [136, 30], [140, 30], [136, 40], [140, 42], [134, 34]],
      "chest": [104, 80]
    },
    {
      "name": "monster_dead", "file": "monster_dead.png", "w": 192, "h": 176, "frames": 3,
      "anchor": [96, 170],
      "description": "Death, same monster and style. Frame 0: knees buckling, head drooping, arms limp, eyes at 50% brightness. Frame 1: toppling forward (toward the facing side) at about 45 degrees, one arm out. Frame 2: lying on its side on the ground line (y=170), head toward the right, tail flat behind, eyes dark (no lime dots), outline unchanged. Must stay inside the 192x176 frame."
    },
    {
      "name": "tank", "file": "tank.png", "w": 44, "h": 26, "frames": 3,
      "anchor": [22, 24], "turret": [24, 9],
      "description": "Enemy tank, side view facing right, 36x18 inside 4px padding. A low wide trapezoid hull on a tread rectangle (treads 36x6 at the bottom), a small domed turret on top at (24,9) with no barrel (the barrel is a separate sprite). Fill #140c33, 2px magenta #ff2bd6 outline plus baked glow, 4 yellow #fff04a tread wheel dots. Frame 0: tread dots at positions A. Frame 1: tread dots shifted 3px (motion). Frame 2: damaged, outline in #b0189a, a jagged white 1px crack across the hull, one tread dot missing."
    },
    {
      "name": "tank_barrel", "file": "tank_barrel.png", "w": 20, "h": 8, "frames": 1,
      "anchor": [3, 4],
      "description": "Tank barrel, 16x4 inside 2px padding, pointing right from the pivot at (3,4). Magenta 1px outline plus a light glow, #140c33 fill, a 2px yellow muzzle tip at the right end. The code rotates it about the anchor to aim at the monster and slides it back 3px during the telegraph."
    },
    {
      "name": "heli", "file": "heli.png", "w": 52, "h": 30, "frames": 4,
      "anchor": [26, 18], "muzzle": [44, 22],
      "description": "Enemy attack helicopter, side view facing right. A 34x16 wedge-nosed oval body with the nose to the right, a thin tail boom to the left ending in a small fin, a skid line underneath, a yellow #fff04a cockpit glint at the nose, and a long thin rotor line on a mast above the body (about 46px wide). Fill #140c33, 2px magenta #ff2bd6 outline plus baked glow, the rotor in yellow. Frames 0 to 2: the rotor drawn at three blur phases (full length, two-thirds with a faint ghost, short with a ghost). Frame 3: dying, outline in #b0189a, the rotor bent and stopped, a white crack across the body."
    },
    {
      "name": "antenna", "file": "antenna.png", "w": 16, "h": 28, "frames": 2,
      "anchor": [8, 28],
      "description": "Power tower roof antenna: a thin mast with two crossbars, a yellow #fff04a 1px outline plus glow, and a light bulb at the top. Frame 0: the bulb lit (a solid 4px yellow dot with a white centre and a wide glow). Frame 1: the bulb dim (yellow at 30% alpha). The code places the anchor at the roof centre."
    },
    {
      "name": "rubble", "file": "rubble.png", "w": 120, "h": 28, "frames": 3,
      "anchor": [60, 26],
      "description": "A collapsed-building debris heap on the ground line: a low, wide, jagged pile 18 to 24px high with broken slabs and a few tilted window rectangles poking out. Fill #140c33, 2px cyan #19f0ff outline plus glow, drawn at full alpha (the code draws it at 40%). Three different heap shapes, one per frame. The code scales it horizontally to the lot width."
    },
    {
      "name": "glyph_signs", "file": "glyph_signs.png", "w": 80, "h": 40, "frames": 3,
      "anchor": [40, 20],
      "description": "Diegetic teaching signs in lime #6dff6d outline plus glow, transparent inside, no fill. Frame 0: a wide keyboard key shape (72x24 rounded rect) with the label SPACE in 12px bold caps. Frame 1: a mouse outline (22x32) with the left button filled lime and the label CLICK to its right. Frame 2: a small key with F, a slash, and a mouse with the right button filled, i.e. 'F / RMB'."
    },
    {
      "name": "crosshair", "file": "crosshair.png", "w": 15, "h": 15, "frames": 1,
      "anchor": [7, 7],
      "description": "Aim cursor: four 1px lime #6dff6d ticks (4px long) around an open 3px centre gap, with a 1px lime dot in the middle and a thin #0b0720 outline so it reads over cyan buildings."
    },
    {
      "name": "icon_heart", "file": "icon_heart.png", "w": 10, "h": 9, "frames": 1,
      "anchor": [5, 4],
      "description": "A small solid lime #6dff6d heart with a 1px #0b0720 outline, drawn after heal popup numbers ('+10' plus the heart) so heals read without colour."
    },
    {
      "name": "logo", "file": "logo.png", "w": 360, "h": 72, "frames": 1,
      "anchor": [180, 36],
      "description": "Title wordmark NEON KAIJU in a heavy, wide, geometric neon-tube style: letters drawn as 3px double-line outlines (tubes) with a wide baked glow. NEON in cyan #19f0ff and KAIJU in lime #6dff6d, with a jagged claw-scratch notch through the K. Transparent background."
    },
    {
      "name": "touch_buttons", "file": "touch_buttons.png", "w": 64, "h": 64, "frames": 2,
      "anchor": [32, 32],
      "description": "Touch controls (nice-to-have). A 60px circle in #0b0720 at 70% alpha with a 2px lime outline plus glow. Frame 0: STOMP, a lime footprint icon with three claw toes and a small impact arc under it. Frame 1: BEAM, a lime open-jaw wedge emitting a straight bar."
    }
  ],
  "sfx": [
    {"name": "stomp", "description": "Heavy sub thud: sine 95->28 Hz at 0.8 gain plus square 62->24 Hz at 0.22, exponential decay, 0.38 s, +/-6% pitch. Played at half gain for a whiffed stomp."},
    {"name": "crack", "description": "Building hit: noise burst through a bandpass at 1.2 kHz (Q 2) with a fast decay, 0.12 s."},
    {"name": "crumble", "description": "Building collapse: brown noise through a lowpass sweeping 2 kHz->150 Hz, plus a sine 70->35 Hz low thud underneath, plus 5 saw grains at 110-460 Hz scattered over the first 0.3 s, 0.6 s."},
    {"name": "swipe", "description": "Claw whoosh: noise through a bandpass sweeping 600->2400 Hz, 0.01 s attack, 0.16 s."},
    {"name": "swipe_hit", "description": "Swipe connect: square 300->90 Hz plus a short noise click, 0.10 s. Once per swipe that hits anything."},
    {"name": "beam_charge", "description": "Rising charge: saw 120->480 Hz through a lowpass at 1.5 kHz with gain rising, 0.25 s."},
    {"name": "beam", "description": "Breath beam sizzle: saw at 90 Hz plus noise through a bandpass at 3 kHz with an 18 Hz tremolo, held 0.35 s, released with an exponential ramp."},
    {"name": "roar", "description": "Signature monster roar: saw 140->60 Hz plus square 144->62 Hz (detuned for beating) through a lowpass at 900 Hz, plus a noise breath layer, 0.7 s. Run start, combo x5 (at most once per 10 s) and death."},
    {"name": "tank_shot", "description": "Tank cannon pop: square 700->300 Hz, 0.08 s, plus a tiny noise transient."},
    {"name": "heli_shot", "description": "Heli burst: 3 noise ticks through a highpass at 2 kHz, 100 ms apart to match the 3 rounds, about 0.25 s."},
    {"name": "unit_die", "description": "Unit crunch: noise through a lowpass 1.5 kHz->200 Hz plus sine 160->30 Hz, 0.35 s, +/-5% pitch."},
    {"name": "hurt", "description": "Monster hit buzz: square 220->70 Hz, 0.22 s. At most one per 0.34 s, matching the flash limit."},
    {"name": "heal", "description": "Heal chime: two sine blips, 660 Hz then 990 Hz, 60 ms apart, 0.15 s. Rising means gain."},
    {"name": "combo", "description": "Combo blip: a square blip at 440*2^(step/12) Hz, so each combo step is a semitone higher, 0.08 s."},
    {"name": "heartbeat", "description": "Low-health lub-dub: two sine 55 Hz pulses 0.12 s apart, each 0.1 s. The game plays it once per second while hp < 30."},
    {"name": "siren", "description": "Surge warning: a two-tone siren, triangle 520 Hz then 700 Hz, two cycles, 0.6 s, quieter than combat cues."},
    {"name": "step", "description": "Footfall: sine 70->40 Hz at low gain (0.25), 0.12 s, +/-8% pitch."},
    {"name": "ui", "description": "Menu click: square blip at 880 Hz through a highpass at 400 Hz, 0.05 s."}
  ],
  "palette": {
    "night": "#0b0720",
    "face": "#140c33",
    "grid": "#2a1b5e",
    "monster": "#6dff6d",
    "monster_dim": "#3a9a3a",
    "city": "#19f0ff",
    "city_dim": "#0f8fa8",
    "hostile": "#ff2bd6",
    "hostile_dim": "#b0189a",
    "reward": "#fff04a",
    "impact": "#ffffff",
    "dust": "#8a7fc0"
  }
}
;
