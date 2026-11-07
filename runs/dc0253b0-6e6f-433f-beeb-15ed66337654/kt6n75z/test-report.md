# Test report: Game forge iterate

- Pipeline: `e0e79c86-afa6-4b85-a772-95afd55544e3`, tested as built (v0). The real pipeline now stands at v2.
- Test copy: `016a1748-454b-4752-83e0-76de929c3424` "Game forge iterate (test)". The loop cap was cut from 20 to 2. Prompts and models were unchanged. The copy is deleted, and its runs stay in history.
- Budget: 45 minutes from 11:01 CST. Both runs started at 11:02:27 and finished by 11:29:17. Nothing needed cancelling.

## What ran

| Run | Inputs | Answers given | Wall clock | Result |
|---|---|---|---|---|
| Happy `505b884e-84be-4d77-9945-105b4a40e93b` | `source-run` 8f2a5b1a (Neon Kaiju); `first-feedback` "The monster feels sluggish to move and the stomp lands late. Make it snappier." | Start with snappier monster; round 1 ask: Easier early game, then a slower damage ramp; round 2 ask: Done | 16 min 34 s | done, every stage passed |
| Stress `00c4ad83-53fa-42e0-b623-e1b6af6a3821` | `source-run` blank; `first-feedback` "Add online multiplayer so a friend can play, redraw the kaiju as a cute pastel dinosaur, and switch movement to the mouse." | Start with your three wishes, Seed challenge, Follow the cursor; round 1 ask: Seed challenge; round 2 ask: Easier first minute, so the cap ended the loop | 26 min 50 s | done, every stage passed |

A person also answered three happy-run follow-ups in the app: no screen shake, "all of the above" and the keep list. The transcript shows each one as a real tool result, so the pipeline did not fabricate them.

Round timing, excluding time spent waiting on answers:

- Happy round 1, a knob change: research 2.5 min, code 1.6 min, merge 0.7 min, verify 9 s. About 5 min.
- Happy round 2, a knob change: about 3 min.
- Stress round 1, a full sprite restyle plus a controls change: research 2.7 min, art 5 min in parallel with code at 1 min, then merge and verify. About 9.5 min.
- Stress round 2, the seed challenge: about 6 min.
- Setup through understand took under 2 min. Each deliver took about 35 s.

The understanding estimated 10 to 20 minutes a round. The measured range is 3 to 10 minutes.

## What worked

- check-source resolved a blank `source-run` to 8f2a5b1a and recorded the harness as absent. Evidence: `~/.modpipes/runs/00c4ad83-53fa-42e0-b623-e1b6af6a3821/stages/check-source/outputs/source.json`.
- The out-of-scope edge worked end to end. First-ask said a static folder cannot hold online play, offered seed challenge or same-screen co-op, and recorded the wish as out-of-scope. Round 2 built the seed challenge.
- A whole-style art round worked. plan.json set `art: true`, the art condition ran the art stage, and art regenerated all six monster strips under a Pillow contract check. Merge overlaid the strips: `monster_idle.png` in merge.game is byte-identical to art's copy. `stages/merge/outputs/screenshots/play.png` shows the mint dino in the neon city.
- The controls-change edge worked. plan.json set `controlsChanged: true`, and code added mouse follow with hysteresis while keeping A/D working. Code also tested the follow headlessly: x moved from 260 to 351.5 in 1 s, then held still.
- Every implementer ran verify.mjs: code twice and merge twice in the happy run. Every verify verdict in all four rounds reads PASS at 60 fps with 0 errors.
- Every round-end ask link returned 200. Each named `merge.game` so the card rendered the build, gave knob values before and after, and offered undo and done.
- Rounds stay on disk: `stages/merge/rounds/1/` and `stages/research/rounds/1/` exist in both runs.
- The done sentinel stopped the happy loop at round 2. The cap stopped the stress loop at round 2. Deliver ran in both cases.
- Deliver on cap exhaustion listed the unbuilt request under "What is left", with the knobs to try. Both play.md files start with a link that returns 200 text/html. Deliver ran both curl and verify.mjs.
- The art stage stayed skipped on the rounds where `art: false`.

## Defects

1. The first-ask play link returned 404 in the happy run.
   - Evidence: `~/.modpipes/runs/505b884e-84be-4d77-9945-105b4a40e93b/stages/first-ask/transcript.jsonl`, the first AskUserQuestion. The link reads `/api/runs/<id>/stages/understand/...` without `/files/`. curl gave 404. The same URL with `/files/` gave 200. The stress run's first ask built the link correctly, so the slip is intermittent.
   - Fix (v1): first-ask and ask now curl the link and confirm 200 before asking. Each prompt names the /files/ segment as the usual culprit.
   - Status: unconfirmed. Live runs snapshot the definition, so neither test run used v1.
2. The keep list was dropped between rounds in the stress run.
   - Evidence: `~/.modpipes/runs/00c4ad83-53fa-42e0-b623-e1b6af6a3821/stages/ask/rounds/1/feedback.md` against `stages/first-ask/outputs/feedback.md`. The user's keep list was "Stomp, swipe and beam verbs, Sound effects". The round-1 ask asked no keep question and rebuilt the list from the changelog, dropping Sound effects. Cause: the ask's inputs hold no earlier feedback, and the validator refuses `ask.feedback` as an input to itself.
   - Fix (v2): the shared change-plan shape now carries the keep list whole. The ask reads `research.change-plan` and starts its keep list there. Research already reads both feedback files.
   - Status: unconfirmed.

## Observations left alone

- The happy first-ask sent two AskUserQuestion calls in one turn. The harness rejected the second, and the model re-asked it correctly. The prompt already says one call at a time.
- On the last capped round the ask offers "more changes" without saying the round is the last. With a cap of 20 this rarely matters, and deliver reports the unbuilt request.
- In the happy run, research answered "the health drain is too hard" with a gentler army damage ramp, not the drain. The user's follow-up answer chose that lever, so this follows the user.
- No source run has a harness, so the bot path through `play.mjs` never ran.

## Versions

- `pipeline-versions/v1.json`: link curl in first-ask and ask.
- `pipeline-versions/v2.json`: the keep list carried through the change plan into the ask.
- `pipeline-versions/NOTES.md` holds the one-line note for each version.
- Voice audit: 0 sentences over 25 words on both versions. Validate: ok. `pipeline update`: exit 0 on both.

## Lessons recorded

- Real pipeline, stage `ask`: carry the keep list from the change plan.
- Real pipeline, stage `first-ask`: the /files/ link form, curled for 200.
- This tester's table: a person may answer in the app during a test, so read the transcript before you call answers fabricated.
- `lessons__pipeline_builder_todos`: confirm v2's two fixes in one fresh run.

## What the next tester should look at first

1. Confirm v2 in one run. Name two keep items at the first ask, then answer the round-1 ask without a keep follow-up. Check that both items survive in `stages/ask/outputs/feedback.md`, and grep the ask transcripts for the curl.
2. Test the bot path with a source run that has `integrate/outputs/harness/play.mjs`, from the current Game forge definition. Make one round change the controls, and check that code updates `play.mjs` and merge runs the bots.
3. Test the undo option ("Put the last round back") and an iterate run whose source is an earlier iterate run. Neither ran here.
