# Neon Kaiju: delivery report

## The game
Neon Kaiju is a side-view neon night-city arcade game on a 640×360 canvas. You are a giant monster whose health drains at 4/s. Collapsing buildings and power towers, and killing tanks and helicopters, heal you. The army ramps up until it overwhelms you. Score is 100 per second survived plus destruction points × combo. Plain Canvas 2D, no build step.

Source run: `8f2a5b1a-40fc-4d2c-ab2d-dde6daefd9fd` (this run: `505b884e-84be-4d77-9945-105b4a40e93b`).

Play: http://localhost:4810/api/runs/505b884e-84be-4d77-9945-105b4a40e93b/files/stages/deliver/outputs/game/index.html

## How to play
| Input | Action |
|---|---|
| A / ← , D / → | Walk |
| Space | Stomp (140 px radius, hits buildings and tanks) |
| Left-click | Swipe toward the cursor (hits buildings, tanks, helicopters) |
| Right-click or F | Breath beam toward the cursor (1.8 s cooldown) |
| Esc / P | Pause |
| Click or Space | Start / restart |
| Touch | Left walk pad, STOMP and BEAM buttons, tap to swipe |

Health starts at 80 (max 100). A building heals +10, a power tower +20, a tank or helicopter +8. A building takes 3 hits.

## Rounds
### Round 1: Stomp impact
- User said: "The monster feels sluggish to move and the stomp lands late. Make it snappier." Then: "The stomps were shaking the screen too much, let's eliminate screen shake and just have the environment react" ("all of the above"). They also said the health-drain tension was too hard for the first level.
- Changed: `stomp.windup` 0.14 → 0.07 s; `monster.speed` 90 → 135; `monster.stride` 0.5 → 0.34 s; `fx.shakeCap` 20 → 0; `beam.rumble` 2 → 0. Added a `quake` block: nearby buildings sway, antennas rattle and a cyan ground pulse runs out. Files: src/config.js, city.js, monster.js, render.js.
- Next the user said: easier early game, dying in the first 40 s, lever = slower damage ramp.

### Round 2: Easier first 40 s
- Changed: `army.tank.dmgStart` 4 → 2; `army.tank.dmgRamp` 75 → 90 s; `army.heli.dmgStart` 1.5 → 0.75; `army.heli.dmgRamp` 75 → 90 s. Only src/config.js.
- Next the user said: "Done, the game is right."

## Keep list
- Snappier stomp and speed (stomp.windup 0.07 s, monster.speed 135, monster.stride 0.34 s)
- No screen shake (fx.shakeCap 0, beam.rumble 0); city sway and cyan ground pulse stay
- Hit-stop freezes (stomp 60 ms, collapse 80/100 ms, death 120 ms)
- Gentler army ramp (tank dmgStart 2, heli dmgStart 0.75, both dmgRamp 90 s)

## Final verify
PASS: 60 fps (worst frame 16.8 ms), keyboard start inside the sandboxed frame, 0 console errors, 0 failed requests. Re-run on the delivered folder: PASS.

## What is left
Out-of-scope wishes: none recorded.
Notes left for the next round:
- Window-light flicker on impact is not built.
- The death-cause text says "Starved" even when army damage was the real cause.
- No bot harness (play.mjs) exists, so novice survival time is unmeasured.

## How to continue
Start this pipeline again with `source-run` set to `505b884e-84be-4d77-9945-105b4a40e93b`.
