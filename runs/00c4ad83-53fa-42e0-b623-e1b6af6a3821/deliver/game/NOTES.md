# Neon Kaiju: game stage notes

This is a static folder. Open `index.html` from file:// or any static host. It is vanilla Canvas 2D with classic scripts, no library and no build. Script order and module roles follow the tech plan §2. Every tunable number is in `src/config.js`.

## Asset contract (for the assets stage)
- Sprites load from `assets/<file>` using the names in `asset-plan.json`. `src/asset-plan.js` is an embedded mirror of the JSON, because file:// can't fetch. Over http, the game fetches `assets/asset-plan.json` and that copy wins. If the JSON changes, regenerate the mirror: `window.ASSET_PLAN = <json>;`.
- Frame width is `image.width / frames`. Anchors, `mouth` (per beam frame), `chest` and `shoulder` are read from the plan.
- **Monster**: drawn from the `monster_*` strips when they load (art direction §0). Code adds the bob, squash/stretch, lean and recoil. Magenta and white tint copies are made at load for the hurt and heal flashes. If a strip is missing, a code rig with the same poses is drawn instead (this departs from tech plan §7.2.1, which wanted a rig only).
- Other missing sprites fall back as follows. tank, heli, barrel, antenna, heart and touch buttons get a visible X box with frame ticks. rubble, signs, crosshair and logo get code-drawn stand-ins. Buildings, beam, swipe trail, rings, particles, shells and popups are always drawn in code.
- SFX: `assets/sfx.js` must define a global `SFX` with `play(name, arg)`. The `combo` cue passes the combo step as `arg`. `unlock()`/`ctx.resume()`, `suspend()`, `resume()` and `setMuted(bool)` are used if present. The cues are the plan's 18 names. Each cue plays at most once per sim tick, and every call is wrapped in try/catch.

## Decisions taken here
- Visuals follow the art direction where it differs from the tech plan: units are magenta, normal buildings cyan, power towers yellow, the beam is lime with a white core, and there is no full-screen collapse flash (the building gets a white silhouette flash plus a ring instead). At most 3 score popups are visible, and popups at the same spot stack upward.
- Pull-forward clearance is `w/2 + 20` instead of `+45` (`CONFIG.city.pullClear`). With +45 the two lots beside the monster could never be pulled, so check 10 failed about 50% of the time under a stomp bot. With +20 it fails 6–16% of the time, and only while buildings are mid-collapse. Pull candidates must also be within ±320 px, so a pull always counts toward the 3.
- GDD check 2 conflicts with the army spec. With no input, the rookie tanks start hitting at about 12 s and the monster dies at 14–16 s. With the army disabled it dies at exactly 20.00 s (starved). The army was left as specified.

## Measured (headless Chrome, 1280×720)
- `__game.start()` reaches `play` with no console errors other than the expected 404s for the absent `assets/`. Against stub PNGs and a stub `sfx.js` there are 0 errors and 0 warnings, all 16 sprites load, and every SFX cue fires.
- Balance (no-render sim, 4 seeds each): idle 14–16 s; walk-and-stomp 31–35 s (< 45 ✓); a perfect all-verbs bot 316–400 s or more (> 90 ✓); a human-like bot (0.3 s reactions, aim error, 1 s idle every 6 s) 174–274 s.
- Stress at the 3.0/s spawn cap (33 units, 200 particles, all verbs firing): fps 60, worstMs 16.8, p95 16.7, step 0.05 ms, heap 2.5 MB.
- Touch: walk pad, STOMP, BEAM (auto-aim), tap-to-swipe and the pause icon all work. Reduced motion, P/Esc pause and blur pause also work.

Debug: `__game.debug` exposes hp, t, combo, units and buildingsStanding. `?seed=N` makes runs reproducible.

## Polish round 1
See `../changelog.md`. Tuning: swipe reach 210, beam cooldown 1.8 s, rookie shell damage 1. The heal flash is now an additive lime glow (`tintLime`) rather than a white silhouette. The swipe has a smear wedge (`swipe.smearIn`). The heal-fly is offset from the score popups. The title text sits on a backing band.

## Polish round 2
- The stomp hits buildings whose centre is inside the ring.
- The beam hits only the nearest building it crosses, and pierces units.
- The combo window shrinks by 0.2 s per step.
- Score time is now 100 per second, and the card shows the breakdown.
- `SFX.suspend()` and `SFX.resume()` added, and priority cues skip the voice cap.
- The CLICK sign triggers when any unit is near swipe reach.
- Heal numbers merge within 0.1 s.
- PNGs are quantised, and `manifest.json` is removed.

## Polish round 3
- Shot damage ramps over the first 75 s: tanks 4 → 6, heli rounds 1.5 → 2 (`Army.rampDmg`).
- Game-over card rows are respaced.
- The CLICK sign sits above the monster on the unit's side (y 128); the F/RMB sign moved to y 80.
