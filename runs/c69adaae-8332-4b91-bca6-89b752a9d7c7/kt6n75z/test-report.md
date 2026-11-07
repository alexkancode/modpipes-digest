# Topic expert forge: test report

Date: 2026-11-06. Pipeline `328fade8-8af3-4f62-a73b-095801c58efa`, now at v3. The test copy was `7449621d-fdb7-4917-b5e1-2ec1af5aad1e`, "Topic expert forge (test)", with the loop cap cut from 3 to 2. The test copy is deleted, and its runs stay in history. Both runs used v1 prompts and models unchanged. Wall clock used: about 17 minutes of the 45.

## What ran

| Run | Inputs | Duration | Result |
|---|---|---|---|
| Happy `40e0f87a-4575-4027-a5ac-308e60621942` | topic: the Fleischer and Natwick topic from the understanding; max-images 6 | 14m07s | done, 100/100 in round 1 |
| Stress `bbc7a730-be57-4b94-8aa4-6eac4caf97af` | topic: CMOS hyphenation vs AP, with a curly apostrophe, double quotes, a section sign, a slash, an em dash and an ampersand; pass-score 95 | 8m38s | done, 100/100 in round 1 |

The stress run pushed three edges from the understanding:

- a text-only topic, which must skip both image stages
- punctuation that could break slug derivation or shell quoting
- a pass score high enough to force the loop to its cap

Stage timings in the happy run:

- triage: 20 s
- research: 2 to 3 min in parallel
- image-scout: 8 min, slowed by Wikimedia rate limits
- image-fetch: 1 s
- writer (opus): 3 min
- examiner (opus): 2.5 min

The nested probes cost 0.08 to 0.20 USD each.

## What worked

All evidence below comes from files and transcripts, not stage summaries.

- Triage wrote clean slugs for both topics: `fleischer-natwick-style` and `cmos-hyphenation-vs-ap`. The punctuation caused no harm. `needs_images` was true for the Fleischer topic and false for CMOS.
- The conditions work. In the stress run, image-scout was skipped by the command condition and image-fetch by the `exists` condition. Writer, lint, examiner and install all ran without images. `lint.json` showed `has_images: false`.
- Every researcher did real research. Each made 6 to 15 Bash or WebFetch calls and wrote a dossier file. The dossiers total 9,796 words for the happy run and 6,094 for the stress run.
- Image-scout searched Commons, built seek-frame URLs, and probed every URL with HTTP 200. Before writing captions, the scout opened a montage of the frames with Read. Image-fetch kept 6 verified files and wrote `index.md`, `images.json` and `index.html`. The fetch also mirrored the folder to `/home/alex/.claude/agents/fleischer-natwick-style-images/`.
- The six captions match what each frame shows. I checked a contact sheet against `index.md`.
- Each writer produced a valid agent of 4,345 and 5,079 words. Lint passed both.
- The examiner method worked as designed. In both runs it took these steps:
  - built `exam/.claude/agents/<slug>.md`
  - ran three nested `claude -p --agent` probes, with zero errors and 1 to 6 turns each
  - wrote `quiz.md` with sourced answers and two contested questions
- The happy drawing `exam/drawing.png` is a real 960x720 grayscale piece in the style:
  - rubber-hose limbs
  - props with faces
  - cast shadows
- The stress examiner swapped in a described-work critique and a practitioner brief, as the prompt asks for text topics.
- The expert score is earned on the stress topic. I asked the same six quiz questions to bare sonnet with no agent and `--setting-sources ""`. Sonnet got about 2.5 of 6 and declined to give the CMOS 18 paragraph, the AP dates and the 2019 reversal. The agent answered all six with sources.
- Install copied the agent and the images and wrote `install.json` with `passed: true` and `rounds: 1`. Handoff wrote a correct `handoff.md` with scores, paths, invocation lines and a drawing link.

## Defects

### 1. The scout files frames that show no trait as trait evidence

- Evidence: `/home/alex/.modpipes/runs/40e0f87a-4575-4027-a5ac-308e60621942/stages/image-fetch/outputs/images/index.md`.
- Image 04, the "Betty Boop design" slot, is the Dizzy Dishes title card. The scout's seek=10 frame landed on the opening credits.
- Image 05, the "Natwick's sensuous line" slot, shows Bimbo at a counter.
- The kept set has no image of Betty Boop at all. The cause: image-fetch keeps the first candidate per trait, and the scout ordered guessed seek frames first.
- Fix in v2: the scout opens every frame and still with Read before listing it. The scout lists a candidate under a trait only when the image shows the trait. The scout leaves out title cards, credit frames and blank pages, and puts the clearest image per trait first.
- Status: unconfirmed.

### 2. The examiner gives full marks while naming a flaw, and the expert anchor has no measurement

- Evidence: `/home/alex/.modpipes/runs/40e0f87a-4575-4027-a5ac-308e60621942/stages/examiner/outputs/scores.json`.
- The `round_note` reads "Minor: drawn line is uniform weight, not visibly thick-and-thin", yet making scored 20/20.
- Both runs scored 100/100 in round 1, including the stress run at pass-score 95. The "15: generic knowledge a model has without the file" anchor has nothing to compare against.
- Fix in v3, in three parts:
  - The examiner asks the same quiz to a no-agent control and saves the answer as `exam/control.json`.
  - An expert score above 28 needs the agent to beat the control by at least two answers.
  - A flaw the examiner names costs the criterion points.
- Status: unconfirmed. My manual control suggests the stress score would still pass, so v3 sharpens the gate rather than reversing a wrong verdict.

### 3. Minor, not fixed

- The trait "Music-synchronized performance" got no image. Triage set `image_target` 6 against 7 traits, so the first-per-trait fetch ran out. One fix: triage sets the target to at least the trait count, capped by max-images.
- The scout wrote its scratch files under `/tmp/s` and `/tmp/f` instead of its work folder. The scratch files are harmless but leak outside the run.
- The handoff links use `../../examiner/outputs/...`. The links resolve on disk. Lesson 23 says such links may 404 in the web app. Not checked.

## Versions

- `pipeline-versions/v1.json`: as built, and the version both runs used.
- `pipeline-versions/v2.json`: the scout trait-fit fix.
- `pipeline-versions/v3.json`: the examiner control probe and the deduction rule. Live now.

Before each update, the voice audit reported 0 sentences over 25 words. `pipeline validate` answered ok. A fresh `pipeline show` matched the file for both v2 and v3.

## Side effects on this machine

- `/home/alex/.claude/agents/fleischer-natwick-style.md` and `fleischer-natwick-style-images/` are installed. That agent is the product the user asked for, so I left both in place.
- I removed `/home/alex/.claude/agents/cmos-hyphenation-vs-ap.md`, which the stress run installed. Before removing it I confirmed the file was byte-identical to the starred copy at `bbc7a730.../stages/writer/outputs/agent.md`.
- The server build differs from the CLI build: the server runs 68ceb65 and the CLI runs b947484. Nothing failed because of the mismatch.

## What the next tester should look at first

1. The revision round has never run. In round 2 the writer resumes with `examiner.report`. Both runs passed round 1, so that path, and install and handoff on a failing agent, are untested.
   - To force round 2, use a test copy with pass-score 101 and cap 2.
   - Then read `stages/writer/transcript.jsonl` for round 2 and `stages/examiner/rounds/1/`.
2. Confirm v2. Run the Fleischer topic with max-images 8. Open `image-fetch/outputs/images/` and check that no title card is kept and that a Betty Boop frame appears.
3. Confirm v3. Check that `exam/control.json` exists. Check that `scores.json` names the control's count, and that any flaw named in the report costs points.

Lessons recorded:

- one row in the real pipeline's `image-scout` table
- one row in the real pipeline's `examiner` table
- one timing row in this stage's table
- todo row 14 in `lessons__pipeline_builder_todos`, covering the open items above
