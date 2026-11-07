# User bible: test report

Pipeline `184c7aff-d637-4879-be19-10eedb04ff61`, tested on 2026-11-06 from 16:49 to 17:08 CST. The pipeline was tested at v1 and is now stored at v3. The test copy "User bible (test)" had a loop cap of 2, unchanged prompts and models, and has been deleted.

## What ran

Both runs started at 16:50:09 on throwaway clones under `/tmp/ub-test/`. No real repo received a commit.

| Run | Input | Duration | Rounds | Gate | Published |
| --- | --- | --- | --- | --- | --- |
| happy `48a1e50b-0337-478d-b874-476c4ff07934` | clone of artist-invest-shop, branch liquid-eq at bb439b4, node_modules symlinked | 10m17s | 1 | coverage ok, critic ship true at 82 | `docs/user-bible/user-bible-v1.html` and `latest.html`, commit 094e9f4 |
| stress `15735487-29dc-475e-a95c-13d3ac09bf80` | clone of itinerary (Next.js 16, Supabase login), both `docs/` and `documentation/`, a seeded `user-bible-v2.html`, no node_modules, crawl-minutes 3 | 12m42s | 2, cap reached | coverage ok, critic ship false at 74 | `docs/user-bible/user-bible-v3.html` and `latest.html`, commit e6489d9 |

Stage timing in both runs:

- code-read: 1-2 min
- crawl: 1-1.5 min
- toolkit (opus): 5-6 min, the critical path
- personas: under 1 min
- paths: 2-3 min
- critic: about 1 min

## What worked

- Code-read found all 10 artist-invest-shop routes, including the three `viz/:technique` values, and all 11 itinerary routes with their guards. Evidence: `stages/code-read/outputs/routes.json` in each run.
- The happy crawl started a throwaway Postgres, ran migrations and captured 8 screens. It flagged the three WebGL canvases as blank, then removed the container and `.env`. Evidence: `48a1e50b.../stages/crawl/outputs/crawl-note.md` and `shots/` (16 files).
- The stress crawl ran `npm ci`, passed placeholder Supabase env vars and captured 7 screens. It recorded each redirect to /login. It removed node_modules, `.next` and `next-env.d.ts` and left `git status` empty.
- version.mjs picked `docs/` when both folders existed, and returned v3 after the seeded v2. An override of `documentation` returned v1. I checked this by hand.
- Publish staged exactly two files in one commit. Nothing was pushed. latest.html is byte-identical to the versioned file.
- The coverage check passed all 12 checks in both runs: no script, no external URL, no overflow at 390 px, axe clean, size under 5 MB.
- Personas were role-named and evidence-backed: 4 code-grounded and 2 labelled inferred on the happy run. Round 2 of the stress run acted on the critic's round 1 notes. It folded the phone persona into the visitor, added a plan-maintainer persona and added participant invite paths.
- The critic spot-checked three claims against the code each round. Both handoffs reported the gate result truthfully, including the stress run's ship false.

## Defects

1. **The critic blocks on CSS that no loop stage can fix.** The stress critic blocked ship in rounds 1 and 2 on the sitemap table wrapping mid-word at 390 px. The toolkit's build.mjs owns that CSS and runs before the loop, so round 2 burned a full round for nothing. Evidence:
   - `~/.modpipes/runs/15735487-29dc-475e-a95c-13d3ac09bf80/stages/critic/rounds/1/`
   - `~/.modpipes/runs/15735487-29dc-475e-a95c-13d3ac09bf80/stages/critic/outputs/verdict.json`

   Fix in v2: rendering defects become notes that start with `render:` and cost score points, never blockers. The toolkit's CSS rules now say table cells never break inside a word, and the file column moves into the route article. **Unconfirmed.** I patched the critic prompt into both runs' snapshots before stress round 2. Round 2 resumes the critic session and never resends the prompt, so the patch had no effect: the round 2 transcript contains no `render:`.
2. **The banner screenshot count is wrong.** The happy banner read "screenshots captured: 0 of 6" while 8 images showed. build.mjs increments the counter while rendering articles, but the banner renders first. A `crawlBySlug` map also keeps only one of the three `viz/:technique` screenshots. Evidence:
   - `~/.modpipes/runs/48a1e50b-0337-478d-b874-476c4ff07934/stages/toolkit/outputs/tools/build.mjs` lines 60-70 and 138

   The stress toolkit, written separately, counted correctly. Fix in v3: count from crawl.json before writing markup, and show one screenshot per dynamic value. The toolkit smoke test now asserts that the fixture banner reads 1 of 3. **Unconfirmed.**
3. **Scratch files land in shared /tmp.** The happy personas stage wrote `/tmp/mkp.py` while the stress personas stage ran in parallel. No clobber was observed. Evidence: `48a1e50b.../stages/personas/transcript.jsonl`. Fix in v2: a shared rule to keep scratch files in the stage's work directory. **Unconfirmed.**
4. **Repeated login screenshots, not fixed.** On a site with login, all 7 stress screens show the same /login image under 7 titles, and the banner says 7 of 7 captured. The critic noted this twice. Fixing it needs a `finalUrl` field in the crawl.json contract, which touches crawl, build.mjs and paths. I left the contract unchanged and recorded a builder todo.
5. **observed is false on a path the crawl saw, not fixed.** `path-visitor-guarded-deep-link` in the stress `paths.json` is marked observed false, but the crawl saw the redirect. Builder todo.

## Housekeeping

- An earlier tester session left a test copy (`c06804cb...`) and two dead runs in attention: `0921d4b2...` and `0b2ee527...`. In each, the stages failed with "process exited with code null". The crawl of run `0921d4b2...` had also leaked a Postgres container, `ub-0921d4b2-...-pg`. I cancelled both runs, deleted that copy and removed the container. The crawl's cleanup cannot run when the process is killed. The next tester should check `docker ps | grep ub-` after any server restart.
- The clones under `/tmp/ub-test/` remain as evidence and are safe to delete.

## Lessons recorded

- Real pipeline, critic: the loop cannot fix rendering, so render problems are notes.
- Real pipeline, toolkit: the banner counter bug, and the table that wraps mid-word.
- Tester table: run timings, and the finding that a snapshot patch does not reach a resumed round 2 session.
- `lessons__pipeline_builder_todos` row 21: confirm v2 and v3, then add `finalUrl` for redirected screens.

## What the next tester should look at first

1. Make one fresh run on a login site, such as an itinerary clone with both docs folders. Check three things:
   - `verdict.json` holds `render:` notes and no layout blockers.
   - The loop stops in round 1 when the content is sound.
   - The banner count matches the img count.
2. Read the toolkit transcript. Confirm the smoke test checked the banner count (v3).
3. Then build the `finalUrl` contract change for redirected screens (todo row 21).
