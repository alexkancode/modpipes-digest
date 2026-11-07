# Path of Ex-iles: delivery report

## Concept

A PG-13 parody action-platformer in the genre of Scarlet Maiden, written for the r/pathofexile crowd. The Exile (the Witch, an adult in her 30s) runs through five well-known PoE story beats, and each one is turned into an awkward rom-com. Her elemental resistances are her outfit. Flirting is an attack that drains her Composure. Every censor bar is a pink mosaic covering something that was already harmless.

**One-line pitch:** *Cap your res, keep your composure, and survive five Path of Exile bosses who are very, very into you, with censor bars that hide absolutely nothing.*

## What was built

- **A static HTML5 Canvas 2D game** with no build step and no CDN dependency. The brief proposed Phaser, but the tech stage chose plain Canvas, so the folder is fully self-contained (≈1 MB). It renders at 640×360 internally, integer-scaled with nearest-neighbour filtering, on a fixed 60 Hz timestep.
- **Five levels and six bosses:**
  - **Twilight Strand:** Hillock, who has waited 300 leagues for you.
  - **Lower Prison:** Brutus, a gym bro looking for a spotter.
  - **Templar Cathedral:** Dominus, the prude. The censor bars are canonically his doing.
  - **Belly of the Beast:** Piety, then the Heart ("you'll have to *take* my heart").
  - **Kitava's Feast:** Kitava eats a resistance layer at 66% and 33% HP.
- **The Hideout between levels:**
  - **Patch Notes:** pick 1 of 3 buff-plus-nerf cards.
  - **Crafting:** Chaos, Exalted and Vaal orbs (the Vaal can brick your weapon).
  - **Trade whispers:** "wtb ur outfit 1c".
  - **Mirror of Kalandra:** the count is always 0, and clicking it says "lol".
- **Signature systems:**
  - **Resistance Wardrobe:** 3 layers. Each pop flies off with a "[removed by moderator]" bar. At 0 layers you are "RES UNCAPPED" in a one-piece and a barrel.
  - **Composure/Charm:** a wink, blown kiss or pickup line makes her Flustered, and you mash J to escape ("Not until I cap my res!").
  - **Censored "cutscenes":** door slam, then "[Rule 3: No Lewds]", then "...and that's how they became friends."
- **Audio:** 64 synthesised WebAudio cues, a music loop per level and for the hideout, and a faster boss variant for each level. Audio stays silent until the first gesture.
- **Machine interface:** `window.__game` with `start()`, `state`, `score`, `perf` and `probe()`, plus seeded RNG through `?seed=N`.

## How to play

| Action | Keyboard + mouse | Touch (basic) |
|---|---|---|
| Move | A / D or ← / → | left half: virtual stick |
| Jump | W, Space or ↑ | Jump button |
| Melee combo (and mash to escape a Charm) | Left click or J | A |
| Spark (aimed) | Right click (aims at cursor) or K (aims facing) | B |
| Dodge roll (i-frames) | Shift or L | R |
| Life flask | Q or 1 | F |
| Pause | Esc or P | pause icon |
| Confirm | Enter, Space or click | tap |

**How to play well:**
- Clear the locked arenas and beat the boss at the end of each level.
- Roll through anything with a pink ♥ tell.
- Keep your layers: a Tailor's Orb restores one, and the Hideout restores all of them.

**Lives and losing:** you get 3 portals per level. A death respawns you at the last checkpoint and costs a portal plus 10% of your currency. Losing every portal ends the run ("RIP. Should've played softcore"), and one key starts a new one.

## How to host

The `game/` folder is complete: it has `index.html` at the root and uses only relative paths.
- **Locally:** open `game/index.html` directly from disk (file:// works), or run `python3 -m http.server` inside `game/`.
- **Online:** copy the folder to any static host (GitHub Pages, Netlify, S3, itch.io as an HTML game).

**Delivery check:** I loaded `game/index.html?seed=1` once in headless Chromium from file://.
- It reached `title` and then `play` after `__game.start()`.
- There were 0 console errors and 0 failed requests.
- It ran at 59.9 fps with a worst frame of 16.8 ms. The probe read hp 70 (from the 80 start), 3 layers, 3 portals and 5 enemies alive.

## The science applied

The fun brief (`stages/fun/outputs/fun-brief.md`) set principles P1–P15 from MDA, Self-Determination Theory, Lazzaro, Juul, Hopson, Swink, Cook and flow theory. The GDD resolved conflicts between those principles and the concept brief in its §0 table. The main mappings:

| GDD decision | Principle and source |
|---|---|
| Charm, Flustered and mash-escape replace the genre's "grab"; flirting is mutual and absurd | P2, consent reframe (content gate) |
| Every censor bar covers something already harmless ("remove the bar and the frame is still PG"); no bar ever sits on the hero | P1, "the joke lives in the gap" |
| Escape mercy after a Charm (1.5 s of i-frames, 3 s re-charm lockout); a faster mash below 30 Composure; Swoon resets Composure to 60; Tea converts to Chaos at full Composure ("Composure taxed") | P6, MDA's Monopoly fix (subsidy and tax against death spirals) |
| Every attack has a tell of at least 400 ms; respawn at a checkpoint within 3 s; L3 is tuned for a median of 1 death | P7, Juul's *Fear of Failing* (fail-then-complete is rated highest, and failure should feel self-inflicted) |
| Six action verbs; one action is reused for the escape-mash; same-frame input response | P8, Ryan/Rigby/Przybylski (competence predicts replay, and intuitive controls work through competence) |
| Patch Notes as a fast 3-card pick; crafting is optional | P9, autonomy through build choice without menu drag |
| Parody fantasy, boss challenge, gag discovery and crafting expression | P10, Lazzaro (hit at least three of the four keys) and the MDA aesthetic order |
| Hitstop, white flash, shake, particles, damage numbers and pitch-jittered cues | P11, Swink (response, context and polish) |
| Chaos 35%, Exalted 8% and a 0.5% Divine "ding", with a 90 s Exalted pity; currency steps between levels stay ≤ 1.2× | P12–P13, Hopson (variable ratio, no sharp drops in reward rate) |
| One new skill atom per level: melee and close Charm, then layers, then ranged, then terrain, then the mix. In-world first-date prompts ("Take it slow. Press J.") | P5 and P14, flow channel and Cook's skill atoms |
| A sawtooth level shape (rising waves, breather, boss); L2's first wave is easier than Hillock | P5, escalate and then teach |
| A death card with "Run it back" one key away; a Standard League stash with a capped meta edge | P15, the next run starts one key and 3 s away |
| Boss HP raised above the brief's numbers so the fights last 25–64 s | GDD §5.4 arithmetic check against the fight-time targets |

## Content check (PG-13 gate): items for you

The concept asks that any content concern go to you for a redirect. No stage shipped anything past PG-13. Four redirects were made during the build, each with a default already applied. Please confirm them or pick the alternative:

1. **Tabula Rasa "naked start"** (fun brief idea). *Applied:* an optional beach-chest gag. Equipping it gives her a shapeless linen sack over her outfit for 10 s, and the bar covers the chest's price tag ("[price fixing removed]"). *Alternative:* the bar covers Bestel's sales pitch instead ("it's basically nothing, which is why it's 1c").
2. **The genre's "grab" loop.** *Applied:* Charm, Flustered and a mash escape. *Alternative:* Charm only costs Composure and never stuns.
3. **Layer-pop shoulder bar.** *Applied:* the garment flies off and the "[removed by moderator]" bar lands on the flying garment, not on her. *Alternative:* the bar lands on the HUD pip.
4. **The Prison level as a warden/captive scenario** (redirected at the brief stage). *Applied:* Brutus is a needy gym bro looking for a spotter.

If any joke in the build still feels off to you, every player-visible string is in `game/js/content.js`, so a redirect is a one-file text edit.

## Play-test scores per round

Each round scored eight criteria. The scores came from `stages/verdict/rounds/<n>/scores.json`, and the final round from `stages/verdict/outputs/scores.json`. The ship threshold is 80.

| Criterion | R1 | R2 | R3 | R4 (final) |
|---|---|---|---|---|
| Reads as concept | 6 | 7 | 7 | 8 |
| Core loop and flow | 6 | 6 | 6 | 7 |
| Game feel | 7 | 7 | 7 | 8 |
| Onboarding | 7 | 7 | 7 | 7 |
| Performance | 8 | 8 | 8 | 8 |
| Art readability | 6 | 6 | 6 | 7 |
| Audio feedback | 8 | 9 | 9 | 9 |
| Acceptance checklist | 6 | 7 | 7 | 7 |
| **Total** | **68** | **71** | **71** | **76** |

**What changed between rounds:**
- **R1 → R2:**
  - Censor-bar set dressing in every level, plus mid-fight trade whispers.
  - Second waves in the arenas.
  - HUD plates.
  - A music bed and pitch jitter on the sound cues.
- **R3:** the build was unchanged. The polish run ended before it made any edit, so R3 re-sampled the R2 build and the scores held.
- **R3 → R4:**
  - L1 grew to 4 arenas and Hillock's HP to 600.
  - Censor bars float above the play lane, so they no longer cover the hero.
  - Fixed a bug that stopped Charm escapes from being counted.
  - "[pickup line]" bars now pop on Charm tells.
  - An attack-token cap of 2 attackers in L1–L2.
  - A boss-music switch.
  - Level-switch warmup to remove the 33 ms hitch.
  - Respawning at 0 layers now restores one layer (anti death-spiral).

**Final-round measurements:**
- 6 bots × 120 s with 0 errors, at 59.9 fps, p95 16.8 ms and worst frame 16.8 ms.
- The polish stage's own bot cleared all 5 levels in 756 s with a flat heap.

## Final verdict

**ITERATE: 76/100, no blockers.** The game is below the 80-point ship bar, but it is complete and playable from start to finish:
- All five levels and Kitava are clearable.
- There are no errors and the frame rate holds a stable 60 fps.
- The parody reads clearly in every frame.

The missing points are mostly about evidence and polish, not broken systems:
- The 120 s harness samples never get past L1, so the later levels, the hideout, Kitava and the game-over card were verified only by the polish stage's bot.
- The hero is still small on screen.

## Next iteration should tackle

1. **Bot coverage.** Add a 5–10 min skilled run and an idle run that captures `over`. Then L2–L5, the hideout, Kitava and the death card get independent screenshots, and acceptance items 7, 9, 10, 12, 13 and 14 no longer depend on the changelog.
2. **Speech bubbles.** Use smaller text and pin each bubble above the speaker's head with a short lifetime and a clamp, so a bubble never covers the hero or nearby foes.
3. **Hero presence.** Raise the camera zoom about 1.25× (or redraw the hero larger) and add more flustered and charmed poses, so she carries the Scarlet Maiden character, not just the props.
4. **Novice opening and run length.**
   - Start L1 with 2–3 foes and only 1 attacker at a time in the first arena, to move toward the 85% first-run clear target.
   - Add about 10–15% to L1–L2 length or boss HP, so a competent full clear lands at 16–18 min. It is about 12.6 min for the bot now.
5. **Combat gags.** Add a mosaic pop on more hit types and clamp edge bars 16 px inside the viewport.
6. **Tutorial sequencing.** Show the jump and attack hints when the first foe comes into range, not only at spawn.
7. **Load time.** Defer non-title art so load stays under 1 s on the skilled profile, which measured about 1.09 s.
8. **Touch.** Give the basic touch controls a real device pass.

## Outputs

- `game/`: the finished game. Open `index.html`.
- `screenshots/`: 36 frames from the final play-test round (skilled, casual and novice bots × 2 seeds, each at title, 5 s, 30 s, 60 s, 120 s and the final frame).
- `report.md`: this file.
