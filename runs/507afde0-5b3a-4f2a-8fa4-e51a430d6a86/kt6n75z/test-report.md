# Stripe billing desk: test report

Date: 2026-11-06, 11:08 to 11:30 CST. Pipeline `1f4d4bee-e2df-4df7-b616-43a64d0f630a`, tested at v1, left at v2.

## What ran

Both runs used a throwaway copy, "Stripe billing desk (test)" (`7df05be5-7767-4436-9bc5-f65dce6580c6`). The polish loop was cut from 3 rounds to 2. Prompts and models were unchanged. The copy is deleted, and its runs stay in history.

| Run | Inputs | Answers given | Time |
| --- | --- | --- | --- |
| Happy `da8b00ba-5fb4-4b35-b602-0386a1bd635c` | repo-path `/home/alex/Desktop/dev/dirslides-correct`, default question | preflight "Done, retry"; checkpoint "Required tasks only". Neither answer registered, see defect 3. | 17:08:46 to 17:27:52 UTC, 19.1 min |
| Stress `3b113848-0685-4c30-a040-d9bd42dafcf4` | repo-path `/tmp/sbd-stress-repo`, question "Which steps remain before real customers can pay, and in what order?" | preflight "Continue without account access"; checkpoint "Pick from the list", then t1+t3, t8, t9 | 17:08:47 to 17:27:51 UTC, 19.1 min |

The stress repo holds one commit with these files:

- A README that claims "Stripe billing is live in production".
- An `.env.example` with a fake `sk_live_` value and an empty `PAYPAL_CLIENT_ID`.
- `src/app.js` saying payments are planned.
- No Stripe code at all.

The Stripe CLI login had expired in both modes, so the account-inspector stage was skipped in both runs, as the condition intends.

Both runs ran into a site-check defect (defect 1). The tester fixed the command in the real pipeline and verified the fix offline. The tester then patched the two test runs' stored definition in `~/.modpipes/modpipes.sqlite` with the fixed command and restarted site-check. Every stage after site-check therefore ran on a patched snapshot.

Timing per group, from the stress run:

- Intake: under 1 min plus the question wait.
- Dossier: 1 min.
- Experts: 1.5 min.
- Lead: 1.2 min.
- Checkpoint: 1 min across four questions.
- Writer: 2 min.
- Site round 1: 2 min.
- Critics: 1 min.
- Site and critics in round 2: 1.5 min.
- Handoff: 0.5 min.

## What worked

Each item below was checked against files or transcripts, not stage summaries.

- **Dossier.** `facts.json` set `newestApiVersion` to `2026-10-28.endive`, a GA version, not the preview. It lists three 2026-09-30.endive breaking changes with changelog URLs. The `docsRead` list has fetch dates.
- **Happy verdict.** `da8b00ba…/stages/lead/outputs/verdict.md` matches the known answer:
  - Checkout, subscriptions, webhooks, portal, entitlements and revenue recovery are each cited to file and line.
  - `price_1UGiKT…B3S5` is cited from `wrangler.toml:30`.
  - The repo's live-mode claims are named and correctly not trusted.
  - Every state is `not-verifiable` because the login expired, never `missing`, as the shared rules require.
  - It also caught that the only account id in the repo is the sandbox account.
- **Stress verdict.** `3b113848…/stages/lead/outputs/verdict.md` judged integration `missing` despite `README.md:3`. It flagged the committed `sk_live_` value as `sk_live_…AbCd`. It noted that rotating does not remove the key from git history. It warned that a hidden billing service could double-charge.
- **Redaction.** Zero unredacted key-like strings appear across all outputs of both runs, by regex over `stages/*/outputs`.
- **Read-only Stripe.** The transcripts show 80 `stripe` mentions inside Bash commands. Every write verb among them (`login`, `listen`, `config`) sits in prose inside heredoc file writes. Not one was run as a command.
- **Checkpoint pick flow.** The stress checkpoint asked one question per tool call, which avoids the parallel-ask server crash. It asked four questions: mode, t1-t4, t5-t8, t9. It wrote `{"chosen":["t1","t3","t8","t9"],"mode":"pick"}`. It warned that five required tasks had been skipped. The t9 answer was not sent by the tester; someone in the app may have answered it.
- **Polish loop.** The loop ran both rounds in both runs:
  - In round 1, the UX critic raised one blocker in each run (border contrast, and on stress also task grouping).
  - The site rerendered from its script in round 2 and cleared both blockers.
  - In round 2 both critics passed, with UX scores of 86 and 84.
  - Stress site-check ended `ok: true` with 3 screenshots.
- **Handoff.** Both runs wrote `handoff.md`. The stress handoff has a "Not verifiable in this run" section and a "Quality gate" section.

## Defects

1. **site-check failed in 0.2 s in every run.** Confirmed fix, offline.
   - Evidence: `~/.modpipes/runs/da8b00ba-5fb4-4b35-b602-0386a1bd635c/stages/site-check/status.json` failureReason reads "here-document at line 1 delimited by end-of-file (wanted `PY')", followed by a python SyntaxError.
   - Cause: the closing line read `PY 2>check.err; code=$?; ...`. A heredoc only ends on a line that is exactly `PY`.
   - Fix in v2: `2>check.err` moves to the opening line, and `code=$?` gets its own line.
   - Verification: the v2 command, run with bash against both sites, exited 0 with 3 screenshots. The patched runs then completed both loop rounds. The fix ran in both runs through the patched snapshot, but no run started from v2.
2. **site-check rejected hyphenated badges and repo sources.** Unconfirmed in a run, confirmed offline.
   - Evidence: the offline report on the round-1 sites failed "badge words state" on every `not-verifiable` card. It also failed "steps well formed" on `file:///…/DOCS.md` sources.
   - Cause, badges: the checker turned `not-verifiable` into "not verifiable" and then looked for those words in the badge text "? not-verifiable".
   - Cause, sources: the writer prompt asks for repo-file sources, but the checker allowed only `http` and `../` hrefs.
   - Fix in v2: the checker compares with hyphens normalised on both sides and accepts `file://` hrefs whose text equals the href. The page contract now says a repo source uses `file://` plus the absolute path.
   - Verification: the stress site went from 2 failed checks to `ok: true`.
3. **An unanswered checkpoint gave `chosen: []`, and the writer ignored that list.** Unconfirmed.
   - Evidence: `da8b00ba…/stages/checkpoint/transcript.jsonl` shows the tool result "The user did not answer the questions." The output `tasks.json` has `chosen []`, while `writer/outputs/steps.json` holds t1 to t9.
   - Root cause: the question text held `=`, and the CLI answer verb splits on the first `=`, so the answer was dropped with exit 0. The preflight answer was lost the same way, so the "Done, retry" path never ran.
   - Fixes in v2:
     - The checkpoint picks every task when the dialog comes back unanswered and says so in the note.
     - The writer writes steps only for chosen ids.
     - Preflight and checkpoint keep `=` out of question text.
   - The happy site kept t1 to t9 against the empty list, so its site-check stayed red through both rounds. The billing critic passed the page anyway and called the mismatch deliberate.

The voice audit on v2 reports 0 sentences over 25 words. After `pipeline update`, `pipeline show` matches the file exactly.

## Versions

- `pipeline-versions/v1.json`: as built by the plan stage, before testing.
- `pipeline-versions/v2.json`: fixes defects 1 to 3 above.

## Lessons and todos written

- Pipeline tables: `checkpoint` (= in question text, the unanswered fallback) and `site-check` (heredoc delimiter, test the stored command string with bash).
- Tester table: rescuing a run by patching `runs.definition`, and the `=` answer trap.
- `lessons__pipeline_builder_todos`: "stripe billing desk v2 unconfirmed, account inspector never ran" and "modpipes answer verb splits on =".

## What the next tester should look at first

1. Run `stripe login` first. The account inspector has never run. Its read-only behaviour and the live versus sandbox-only verdict are the core of the ask, and both are untested.
2. Answer the questions in the app, or check each question text for `=` before answering from the CLI.
3. Start one v2 run on dirslides-correct. Confirm that site-check passes and that `tasks.json` and the site's task sections agree.
4. Watch whether the billing critic still passes a page that contradicts `tasks.json`. Round 2 showed the critic accepting a page that site-check failed.
