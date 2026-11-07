# Last Light Pond: delivery report

**Concept:** a frog hopping between lily pads to catch fireflies before the pond freezes over.

**Pitch:** Hop a frog across drifting lily pads and snap up fireflies. Their warmth pushes back a ring of ice that is closing in on the pond.

**Result:** SHIP at 80/100 after three play-test rounds (69 → 75 → 80), with no blockers. The delivered build is the scored build: the polish changelog (11:46:06) predates the bot runs (11:46:18) and the verdict (11:51:14), and the verdict scored build hash 3eed0722.

## What was built

- A single-screen arcade game in plain Canvas 2D with no libraries and no CDN. Logical size is 640×360, integer-scaled and letterboxed. Pixel art uses a dusk palette: amber and green against teal and ice white.
- **Files:** `index.html`, 11 script modules in `js/`, 11 sprite PNGs, and `assets/sfx.js`. The whole folder is 228 KB.
- **Audio:** 12 WebAudio-synthesised cues plus a soft ambient bed. Audio stays silent until the first gesture, and M mutes it.
- **Screens and loop:**
  - The title screen is the live pond with a hint panel.
  - In play, the frog hops between 11 drifting pads and tongues fireflies. Every catch melts the ice ring back, and gusts arrive at 40, 85 and 130 s, each followed by a firefly swarm.
  - A run ends one of two ways. "Jar full!" (hibernated) comes at 80 fireflies. "Frozen" comes when the ice takes the frog's pad or warmth hits its floor.
  - The over card shows score, caught/target, "N to go", time, best streak, seed and a tip. Restart goes straight back into play.
- **Machine interface:**
  - `window.__game` exposes `start()`, `state`, `score`, `perf`, `probe()` and `scene()`.
  - `?seed=N` makes runs deterministic, and `?manual=1` gives idle runs with no input.
  - `probe()` returns R, caught, jarTarget, streak, padsOpen, gustsDone, midHopCatches, iceDistToFrog and the other balance fields.

**Delivery load check:** loaded headless from `file://` with `?seed=7`. The state was `title` until `__game.start()`, then `play`. After 4 s: 59.9 fps, worst frame 16.8 ms, 0 long frames, 7 fireflies alive, jarTarget 80. There were no console errors, page errors or failed requests.

## How to play

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Hop | Click or tap a lily pad in range | Arrows / WASD hop to the nearest pad in that direction; chevrons show where each key goes |
| Snap (tongue) | Click or tap a firefly | X, J, K, or Space in play (auto-aims at the nearest lit firefly) |
| Start / restart | Click | Space or Enter |
| Pause | — | P or Esc; also pauses automatically on blur or tab hide |
| Mute | Speaker icon | M |

- **Goal:** fill the jar with 80 fireflies. A golden firefly counts 3.
- **Ice:** the warmth bar (top right) is the ice clock. Each catch pushes the ice back, and a pad whose rim turns white is about to freeze.
- **Fireflies:** only lit fireflies can be caught.
- **Scoring:** snapping while mid-hop scores double, and consecutive catches build a streak.
- **Run length:** about 1:40 to 2:00 per run.

## How to host

Copy the `game/` folder to any static host, for example GitHub Pages, Netlify, S3 or itch.io as an HTML upload, and open `index.html`. All links are relative and nothing loads from outside the folder. Opening `index.html` straight from disk (`file://`) also works, and so does `python3 -m http.server` inside the folder.

## The science applied

The concept brief chose the loop and identity features, and the fun brief (`stages/fun/outputs/fun-brief.md`) set the research-backed rules. The GDD's §0 table settled where the two disagreed.

| GDD decision | Principle (source) | How it shows up in the game |
|---|---|---|
| Hop starts on the input frame. It always lands and homes on its drifting pad. There is a 120 ms input buffer, and arrow keys hop at once with chevron previews | Intuitive controls drive competence, and competence predicts continued play (Ryan, Rigby & Przybylski SDT, β .40/.41). A response under 0.1 s feels instant (Nielsen). Natural mapping (Swink) | Click the pad you want. Keyboard players see where each arrow goes. Precision comes from tongue timing, not from punishing landings |
| The ice is a visible ring on the pond, and every catch visibly pushes it back | Flow needs clear goals and immediate feedback (Csikszentmihalyi). The player must see a catch pay for itself in time. Avoidance schedules (Hopson) | Catches melt the ring back with shards and a thaw cue, so the countdown becomes a tug-of-war |
| Pads go through 1.5 s of frosting (white rim plus `crack`) before they freeze | Losses should feel like the player's fault (Juul, self-blame p < .016) | No pad freezes without warning |
| Gusts at 40, 85 and 130 s, each followed by a swarm | Tension, release and resolution (MDA). Avoid sharp drops in the reward rate (Hopson) | Short spikes of double shrink, then a burst of fireflies to win the ground back |
| Death-spiral brake: inner pads stay open while R ≥ 0.45, and firefly respawn speeds up as the pond shrinks | MDA's Monopoly feedback loop and its subsidy fix | Late runs are tight but never hopeless |
| Golden firefly on a variable ratio (about 1 in 12 spawns, never two in a row) | Variable-ratio schedules give the highest activity, and fixed ratios cause pauses (Hopson) | An unpredictable bonus that drifts toward the ice, so taking it is a risk/reward choice |
| Mid-hop snap scores ×2. Streak gives +5 per step, and the catch pitch rises with it | Skill atoms and skill chains (Cook). Meaningful choice as autonomy (SDT) | The second verb rewards chaining hops and snaps instead of sniping from one pad |
| Title is the live pond. One-time labels ("the pond is freezing!", "snap!", "thaw!", "golden!"). No tutorial screen | Skill atoms are learned by exploration and staged in the first 30 s (Cook) | Players learn by playing, and each label appears only once |
| Juice is rationed: squash and stretch, ripples, catch bursts. Shake only on gusts and the freeze; hitstop only on goldens | Polish should make the world feel physical, and juice that fires on everything stops carrying information (Swink; fun §6) | Big moments read as big |
| The thaw cue is the relief sound, and it now plays 60 ms after the catch ping | Relief is an emotional payoff (Lazzaro, Altered States) | The catch pitch ladder stays audible on fast streaks |
| Two endings, a near-miss readout ("26 to go") and instant restart | Players who fail some and then win rate a game highest (Juul). Frustration turning to fiero (Lazzaro). Nielsen's 1 s limit | Skilled players win, novices freeze, and either way they can try again at once |

### Deviations from the GDD

The GDD text still shows the round-0 numbers. The shipped values come from tuning against the play-test:

| Value | GDD | Shipped |
|---|---|---|
| Jar target | 40 | 80 |
| Start warmth / cap | 0.90 / 1.00 | 0.80 / 0.80 |
| Shrink rate | 0.009 + 0.00005·t | 0.0075 + 0.0001·t |
| Melt | 0.06 | 0.018, golden 0.054 |
| Gusts | 60 / 120 / 180 s | 40 / 85 / 130 s |
| Fireflies | No lifetime | 6 s lifetime, 1.0 s swallow lockout |

Two GDD aims gave way to the harness's 120 s cap:

- **Run length:** runs were shortened so that both end states happen inside the cap.
- **Skilled win time:** skilled players now win at about 1:51, not the 2:30 the fun brief targeted.

## Play-test scores per round

Rounds 1 and 2 are read from `stages/verdict/rounds/<n>/scores.json`, and round 3 from `stages/verdict/outputs/scores.json`. Each criterion is scored out of 10 at the stage's weighting, giving a total out of 100. The ship bar is 80.

| Criterion | R1 | R2 | R3 (final) |
|---|---|---|---|
| reads-as-concept | 7 | 8 | 9 |
| core-loop-and-flow | 6 | 7 | 8 |
| game-feel | 7 | 7 | 8 |
| onboarding | 7 | 8 | 8 |
| performance | 9 | 9 | 9 |
| art-readability | 6 | 7 | 7 |
| audio-feedback | 7 | 8 | 8 |
| acceptance-checklist | 6 | 6 | 7 |
| **Total** | **69** | **75** | **80** |
| Verdict | ITERATE | ITERATE | **SHIP** |

**What moved each round:**

- **Round 1 → 2:**
  - Competent bots were winning without ever seeing a frozen pad, so the balance was retuned to make good play tense.
  - Fireflies are now always on screen with bigger halos.
  - The ice band is drawn from the start.
  - The title panel was moved, the HUD scaled to 1.5×, and catches given more weight.
- **Round 2 → 3:**
  - No run reached an end state inside the 120 s harness cap, so the jar went from 110 to 80 and the warmth from 0.90 to 0.80. Skilled bots now win, novices freeze, and casual bots end a few fireflies short.
  - The title was split into two panels drawn under the pads.
  - Popups got an ink outline.
  - The frog got a tongue-ready halo and the "gulp" lockout cue.
  - The thaw cue was offset from the catch cue.

**Final round results:**

| Bot | Result | Time | Caught | Lowest warmth |
|---|---|---|---|---|
| Skilled | Won 2 of 2 | 1:53–1:56 | 80/80 | 0.55–0.57 |
| Casual | Still playing at the cap, 0 of 2 | 120 s | 71/80 and 77/80 | 0.34–0.45 |
| Novice | Froze, 2 of 2 | 1:40 and 1:58 | 36–54/80 | 0.10 |

- **Performance:** 60 fps, worst frame and p95 both 16.8 ms, 0 long frames. Load took 655 ms, and no run had errors.
- **Heap:** polish measured 2.47 MB at 30 s and 2.66 MB at 180 s.

The final screenshots are in `screenshots/`, covering three bot styles (skilled, casual, novice), two seeds each, at title, 5 s, 30 s, 60 s and over.

## Final verdict

**SHIP, 80/100, no blockers.**

- **Strongest areas:**
  - The game reads as the concept (9/10): the freeze shows from the first frame, and the over card ties the ending back to the frog hibernating.
  - Performance is 9/10.
  - The outcomes spread by skill, which is what the fun brief asked for.
- **Weakest areas:**
  - Art readability (7/10): feedback text overprints itself.
  - The acceptance checklist (7/10): several GDD checks have no probe or harness coverage yet.

## Next iteration

Ordered by value, from the verdict notes:

1. **One popup line.**
   - **Problem:** "streak N", "×2", "mid-hop!", "gulp" and "+score" overprint each other and the frog.
   - **Fix:** queue or merge them into one line about 20 px above the frog (`js/fx.js`).
2. **Teach the mid-hop snap during play.**
   - **Problem:** novices made 0 mid-hop catches out of 36–54 catches.
   - **Fix:** brighten the in-range outline during hops. Add a one-time "snap while hopping" prompt at about 20 s for players who still have 0 mid-hop catches (`js/frog.js`, `js/render.js`).
3. **Title layout.**
   - **Problem:** pads and fireflies still drift over the hint panels.
   - **Fix:** merge the two panels into one placed over the ice band or shore, so no target competes with the text.
4. **Session length.**
   - **Problem:** skilled wins land at about 1:55, just inside the 2-minute scope floor, because the harness cap forced it.
   - **Fix:** raise the bot cap to about 3:30, then raise `jarTarget` to about 90 so skilled play wins near 2:15 and casual play finishes too.
5. **Fireflies over ice.**
   - **Problem:** a firefly over the white sheet nearly disappears.
   - **Fix:** give it a thin dark ring or a warmer core.
6. **Small fixes:**
   - On the win card, the dimmed HUD warmth behind it (100%) disagrees with the real end value (59%).
   - Add a "pond warmth" label next to the warmth bar.
   - Add drifting snow or a glint so the Frozen card isn't a static slab.
7. **Contract hygiene.**
   - **Problem:** the GDD still shows round-0 numbers, and several checklist items have no bot checks.
   - **Fix:** update GDD §2 and §11 to the shipped numbers. Add bot checks for checklist items 2 (hop latency), 5 (mid-hop ×2 and miss reset), 6 (dim firefly uncatchable), 8 (frozen pads untargetable), 14 (seed determinism with scripted inputs) and 15 (nearest-firefly bot on 10 seeds). Extend the perf sample to 60 s with heap readings.
