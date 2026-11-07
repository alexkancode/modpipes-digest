# Neon Kaiju: delivery report

## The game
Neon Kaiju is a side-view neon night city where you are a giant monster. Your health drains 4/s from 80, and only destruction heals you: buildings +10, power towers +20, tanks and helicopters +8. After two rounds the monster is a cute mint pastel dinosaur steered by the mouse, and a shareable CITY number lets a friend play the same city. Single player, static folder, no storage.

Source run id: 8f2a5b1a-40fc-4d2c-ab2d-dde6daefd9fd (this run: 00c4ad83-53fa-42e0-b623-e1b6af6a3821).

Play: http://localhost:4810/api/runs/00c4ad83-53fa-42e0-b623-e1b6af6a3821/files/stages/deliver/outputs/game/index.html

## How to play
- Mouse: put the cursor about 64 px ahead of the dino and it walks; it stops within 24 px of the cursor or when the pointer leaves the frame. A/D or arrows still walk and take priority.
- Left click: swipe toward the cursor (210 px, 100° arc, hits helicopters). Cooldown 0.45 s.
- Right click, F or K: breath beam toward the cursor (700 px, pierces units, hits the first building). Cooldown 1.8 s.
- Space: stomp (140 px ring, kills tanks, cannot reach helicopters). J: auto-aim swipe.
- Esc or P pauses, M mutes. Any key or click on the title starts; click or key on the game-over card restarts.
- Title and game-over cards: click the CITY line and type digits, R rolls a new city. `?seed=N` in the URL sets the city.
- Touch: left 40% is the walk pad, with STOMP and BEAM buttons.

## Rounds
### Round 1: your dinosaur, a cute pastel dino steered by the mouse
- User said first: "Add online multiplayer so a friend can play, redraw the kaiju as a cute pastel dinosaur, and switch movement to the mouse."
- Changed: 6 monster strips redrawn as a mint #a8f5c4 dino with lilac plates, peach blush, one big eye, and the 2 px lime outline (192×176, same frame counts: idle 3, walk 4, stomp 3, swipe 4, beam 7, dead 3). Added `CONFIG.monster.followStart` 64 and `followStop` 24. Mouse-follow walking with hysteresis, pointerleave stops, canvas `tabindex` and focus on pointerdown. Title hint now reads "MOUSE walk".
- Verify: PASS.
- What the user said next: multiplayer held back as out-of-scope (needs a server); the user took "Seed challenge" as the stand-in.

### Round 2: seed challenge, a city number you share with a friend
- Answered: "Seed challenge". Online multiplayer stays out of scope.
- Changed: `Rng` split into three streams (city, army, fx) so every restart replays the same city and opening waves. Digits typed on the title or game-over card set the city, R rolls one, and per-city BEST HERE is kept in memory. `CITY ####` line added to the title (y 300) and game-over card. `__game.debug` gains `city`.
- Files: src/util.js, army.js, fx.js, city.js, input.js, main.js, run.js, render.js, harness/README.md. Art edits: none.
- Verify: PASS, 60 fps, 218 kB, 0 errors.
- What the user said next: "Easier first minute" (balance, frustrating). A novice dies at about 40 s. Hint: novice survival to 50-60 s, damage ramp 75 to 90, clearer death cause. This request was not built; it is listed under what is left.

## Keep list
- The mint pastel dino art (192×176 frames, lilac plates, big eye, lime outline and glow).
- Mouse-follow walking (start 64 px, stop 24 px), A/D still working, left-click swipe, right-click beam, Space stomp. The dino stops when the pointer leaves the frame.
- Seed challenge: CITY #### line on title and game-over cards, click it and type 4 digits, R rolls, every restart replays the same city and opening waves, BEST HERE per city.
- 60 fps, verify PASS, canvas focus on click.

## Final verify
PASS (60 fps, worst frame 16.8 ms; 218 kB; keyboard start in the sandboxed frame works; 0 console errors; 0 failed requests). Re-run on the delivered folder: PASS.

## What is left
- Out of scope: live online multiplayer (needs a server; the game must stay a static folder).
- Requested, not built: "Easier first minute". Try `dmgRamp` 75 to 90, heli `dmgStart` 1.25, and a death cause that names the real damage source (src/render.js ~626, src/run.js ~73).
- Typing a new city on the title changes only the line. The skyline behind it updates at run start.
- No bot harness (play.mjs) exists. A bot must park the mouse over the dino or off the canvas, and must not start with a click on the CITY line.
- Source notes: acceptance checks 2 and 10 are known design conflicts; touch is untested on a real device.

## How to continue
Start this pipeline again with source-run set to 00c4ad83-53fa-42e0-b623-e1b6af6a3821.
