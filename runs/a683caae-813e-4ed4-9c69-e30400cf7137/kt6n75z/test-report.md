# Test report: Stage splitter

- Pipeline: `752f54e9-31fe-4982-ad7c-8337eafba6b3`. It was tested at v1 and left at v4.
- Test copy: `8d627fbe-7995-4407-a3d9-9e0fed18720e`, "Stage splitter (test)", with the judge-loop cap cut from 3 to 2. The copy is now deleted.
- Date: 2026-11-06, 12:01 to about 12:22 CST. Two runs, started together at 18:02:06Z.
- Versions: `pipeline-versions/v1.json` to `v4.json`, with one note per version in `pipeline-versions/NOTES.md`.
- Builder todos: none of the 16 open rows concerned Stage splitter, so none was closed.

## What ran

| Run | Input | Floors | Took | Result |
|---|---|---|---|---|
| happy `07ed9536-b380-4444-9524-1f5540cb6114` | Game forge run `8f2a5b1a` (14 stages, 2 loop rounds, 1 restarted stage) | default 60 s, 15 % | 4m55s | No split endorsed. Build skipped. Report says nothing saved. |
| stress `b411a216-f366-45e8-8918-aba092880b4b` | Credit repair run `02e98ac7` (4-round loop, interactive interviewer) | 10 s, 3 % | 7m53s | `playbook` split into three. Skeptic passed in round 1. The build saved `ca9e8735`, which I deleted after the read. |

The stress run pushes four edges the understanding names: a looped span with a 4-round stage, a split whose consumers sit inside that loop, the build path with rewiring, and low floors.

Stage times, from the `result` lines in each transcript:

| Stage | happy | stress | Tool calls (happy / stress) |
|---|---|---|---|
| gather (script) | 0.6 s | 0.3 s | none |
| prompt-lens | 59 s | 43 s | Bash 3 + Write 1 / Bash 3 + Write 1 |
| transcript-lens | 158 s | 137 s | Bash 12 + Write 1 / Bash 8 + Write 1 |
| output-lens | 91 s | 62 s | Bash 6 + Write 1 / Bash 5 |
| judge (opus) | 90 s | 112 s | Bash 7 / Bash 6, Read 1, Write 1 |
| skeptic | 14 s | 88 s | Bash 2 / Bash 9 |
| build-split (opus) | skipped | about 2 min | none / 11 Bash, including 2 validates and 1 create |
| report | 30 s | about 30 s | Bash 2 / Bash |

## What worked

- Gather is fast and complete. It produces 14 and 11 timelines, the critical path and the candidates in under a second.
- The lenses read evidence, not prose. The stress transcript-lens named cluster times (c10 93.6 s, synthesis 147 s) and caught the interviewer's human chain. The happy prompt-lens flagged that `art`'s 919 s was mostly stopped time.
- The judge shows every term of the saving arithmetic. It multiplies looped stages by their launches and keeps interactive and looped stages for the right reasons.
- The skeptic did real work on the stress split. It ran 9 Bash calls over the raw transcript and found a missed wave-2 fetch (c14). It halved the saving to about 55 s and still passed, because 55 s clears the floor. The report shows both figures.
- The build applies the split to the run's definition, rewires six consumers and leaves the interview loop intact. It validates, fixes its own `invalid_format` codes, validates again and saves with `pipeline create`. It copied 13 lesson rows. The original Credit repair pipeline `46bea631` is untouched: its `updatedAt` is still 2026-11-03.
- The empty-endorsed path works end to end. The skeptic writes `SKEPTIC-PASS` in 14 s, the build condition skips the build, and the report says nothing was saved.
- The new stage prompts in the saved split pass the voice audit. All 30 long sentences in the audit of `ca9e8735` come from the source Credit repair prompts.

## Defects and fixes

### 1. The percent floor made the known answer impossible (v3, unconfirmed)

- Evidence: `~/.modpipes/runs/07ed9536-b380-4444-9524-1f5540cb6114/stages/judge/outputs/verdicts.md`, lines 4 and 29 to 37.
- The floor is 15 % of the sum of group wall-clocks. On Game forge that sum is 4232 s, so the floor is 634.8 s. The lead of `game` is 632 s, so no split of `game` could pass. The plan names that split as the known answer.
- Fix: `min-saving-percent` now defaults to 5. The variable description warns that above 10 % a long run can endorse nothing.
- Status: unconfirmed. No run used the new default. The judge's 422 s saving for `game` is 10 %, which clears 5 %. The judge also called the seam "not unanimous", so the outcome under v3 is still open.

### 2. Gather ranked a restarted stage by elapsed time (v2, verified offline, unconfirmed in a run)

- Evidence: `~/.modpipes/runs/07ed9536-b380-4444-9524-1f5540cb6114/stages/gather/outputs/summary.json`. `art` shows `lastSeconds` 919 and `workSeconds` 278, yet `leadSeconds` 622 and `candidate` true. `perf` (296 s of work) was marked slack.
- Fix: `gather.mjs` adds `busySeconds`. The field is the last launch for looped stages and the summed work for others. Lead, slack, the group wall and the critical path now use `busySeconds`.
- Offline check: I ran the stored command through bash on both source runs, with exit 0 each time. `art` drops to lead −18 and `perf` becomes the Understand candidate. The Credit repair candidates are unchanged.
- Status: unconfirmed in a run. The judge in v1 had already worked around the problem by reading the elapsed note, so the run's verdict was not wrong.

### 3. The judge wrote output names the validator rejects (v4, unconfirmed)

- Evidence: `~/.modpipes/runs/b411a216-f366-45e8-8918-aba092880b4b/stages/build-split/outputs/build-notes.md`, section Validator codes. There were 15 `invalid_format` codes for `playbook_scoring` and similar names.
- Fix: the judge prompt asks for a kebab-case output name.
- Status: unconfirmed. The build recovered by itself, so the defect cost one validate round, not a failure.

### 4. Consumer prompts still named the old output (v4, unconfirmed)

- Evidence: the same `build-notes.md`, section Prompt edits. Six consumers say "the playbook" but now receive two or three files.
- Fix: the judge adds a consumer edit for each consumer whose prompt names the old output. The edit is one sentence that names the replacement outputs, and it goes in `promptEdits`, which the build stage already applies.
- Status: unconfirmed.

## What the next tester should look at first

1. Start v4 on Game forge run `8f2a5b1a-40fc-4d2c-ab2d-dde6daefd9fd` with default floors. Read `judge/outputs/splits.json`. If `game` is kept only because of the seam leak, the rule that all three lenses must agree may be too strict. Compare with the hand-made Game forge v2 split, `ed5d719e-f049-4874-bdeb-5352aa6a888f`.
2. In the same run, confirm that `summary.json` names `perf`, not `art`, as the Understand candidate.
3. Rerun the stress input on v4 and confirm that the build validates on its first try and that `promptEdits` holds consumer sentences.
4. Delete any "(split)" pipeline a test saves. The build also copies lesson rows into the new pipeline's tables.

These steps are recorded as a row in `lessons__pipeline_builder_todos`. Two judge lessons went to the real pipeline's judge table, and one timing lesson went to this stage's table.
