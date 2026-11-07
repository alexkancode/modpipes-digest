# Song forge: test report

Date: 2026-11-06, 16:04 to 16:50 CST. Pipeline `2b6a02f9-4629-44cd-a1f2-b1b938e4a81e`, tested at v0 and left at v2.

## What ran

Test copy "Song forge (test)" (`cd97737c-b8ee-4e88-87e9-7a3fbd202342`), loop cap 2, prompts and models unchanged. Both runs started at 16:05:11. The copy is deleted, and both runs stay in history.

| Run | Inputs | Time | Result |
|---|---|---|---|
| Happy `ded9f511-3a82-42d3-a4a2-588e018149a4` | indie folk; two friends meet at a bus stop after twenty years; motifs: timetable, rain on the shelter roof, rising fourth on the title; 1.5 min; no key | 29.1 min | shipped round 2 (68, then 70); page-check ok |
| Stress `53fa4c7f-1492-41bf-a31e-ca546b898584` | Portuguese; "90s trip hop crossed with fado"; nurse in Lisbon; ten motifs including 6/8 verses against 4/4 chorus; second person countertenor; three references; 1 min; invalid Gemini key | 40.6 min | shipped round 2 (63, then 69); page-check failed 3 of 11 checks |

Stage times: research 1-2 min. Toolkit 11.5 and 15.5 min, the long pole. Writers 6-8 min. Judge about 4 min. Polish rounds 3-5 min each. Assets, page and overview about 1 min.

## What worked

Each item below was checked against files and transcripts, not stage summaries.

- Every writer ran `check-abc.mjs` on its own song, and all six songs passed (writer transcripts). The loop spent rounds on craft only.
- The stress writers wrote Portuguese lyrics and inline meter changes, `M:6/8` to `M:4/4`. The checker accepted both: 29 bars, 66.7 s.
- The two gates disagreed usefully. In stress round 1 the checker passed, but fresh-eyes said agree false, because the reader missed the nurse. The critic made that a brief-fit blocker. In round 2 the reader named "a nurse working the night shift" and agreed.
- The critic was not lenient. It blocked round 1 in both runs with quoted lines, and `history` carried both rounds.
- The judge's `pick.json` names a winner and a concrete borrow list.
- The invalid key degraded cleanly. Render returned HTTP 400 API_KEY_INVALID, `render-failed.md` was written, and the page and overview showed the reason. A grep for the key in render-status.json, index.html and overview.md found zero hits. The Interactions endpoint answered 400, not 404, so the URL exists.
- No artist name from the references reached `lyria-prompt.txt`.
- The happy page passed all 11 checks. The synth started with no remote requests, and axe was clean (`page-check/outputs/report.json`, `shots/page-390.png`).

## Defects

1. Stress page has no scorecard.
   - Evidence: `runs/53fa4c7f-.../stages/page-check/outputs/report.json` reports still-frame scorecard table false.
   - Cause: that run's toolkit invented a `criteria` array in `fixtures/sample-scores.json`. Its build-page reads only arrays (`toolkit/outputs/toolkit/build-page.mjs:117`), so the critic's object keyed by criterion rendered "No scorecard was supplied". Rounds showed no totals either.
   - Fix v2: the toolkit prompt pins the scores.json and history shape in the scorecard bullet. The fixture bullet now points at that shape. **Unconfirmed.**
2. Stress demo playback fails.
   - Evidence: the same report shows running-frame `Can't load sound at sf/voice_oohs-mp3/D4.mp3 status=404`, plus console errors.
   - Cause: the song sets `%%MIDI program 53`, and only the piano soundfont is vendored. The happy toolkit happened to rewrite programs to 0. The stress toolkit did not.
   - Fix v2: the build-page spec now rewrites every `%%MIDI program`, `chordprog` and `bassprog` number to 0 in the demo ABC. **Unconfirmed.**
3. Overview names the wrong gate.
   - Evidence: both overviews say "The cap of 4 was not reached" on a cap-2 copy (`stages/overview/outputs/overview.md`). The prompt hard-coded "the cap of 4".
   - Fix v1: the overview infers the gate from the last round's three flags. **Unconfirmed.**
4. Toolkit is slow and lost time to a hung probe.
   - Evidence: the stress toolkit transcript at 22:11:59. A hand-written fake server never closed on its 500 branch, and the Bash call timed out at 120 s. Both runs also wrote scratch under fixed /tmp paths: /tmp/tk, /tmp/ck, /tmp/ly and /tmp/st.
   - Fix v1: keep scratch in the stage work directory and wrap probe servers in `timeout 60`. **Unconfirmed.** This fix trims the hang only, not the 11-15 min rebuild.

Versions are saved under `pipeline-versions/`, with `notes.md` beside them. After each update, `pipeline show` matched the generated file, the voice audit found 0 sentences over 25 words, and validate returned ok.

## Not resolved

- The toolkit rebuilds the same five scripts every run, in 11-15 min. Each run therefore carries a different checker and page builder. Defects 1 and 2 hit one run and not the other because of this drift.
- A toolkit cache would remove both the time and the drift. The cache would be a script stage that reuses a toolkit whose selftest passes. That is a design change, so it is logged in `lessons__pipeline_builder_todos` as row 19.
- The 390 px scorecard table squeezes long quotes into a narrow column (happy `shots/page-390.png`). The table stays readable, but it is long.

## What the next tester should look at first

1. Run a cap-2 copy of v2 with the stress inputs above. Read `page-check/outputs/report.json` for a scorecard table and a running synth. Read `overview.md` for the gate sentence.
2. Read `toolkit/outputs/toolkit/build-page.mjs` for the MIDI program rewrite and the `scores` object read.
3. Decide on the toolkit cache, per todo row 19.
