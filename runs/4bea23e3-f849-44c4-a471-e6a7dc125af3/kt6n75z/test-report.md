# Test report: ChatGPT ad plan

- Pipeline id: `b9afa7ec-8375-40a9-bb31-cd7aefffa6cf`. Tested on the stored version from the plan stage (v0). Left at v2.
- Session: 10:53:56 to 11:22 on 2026-11-06, inside the 45-minute budget.
- Test copy `0ff58442-929f-43d4-b459-da869e926802`, "ChatGPT ad plan (test)", polish loop cut to 2 rounds. Prompts and models unchanged. Deleted after both runs finished. Its runs stay in history.

## What ran

| Run | Inputs | Started | Finished | Wall clock | Rounds | Final gates |
| --- | --- | --- | --- | --- | --- | --- |
| Happy `9f53bf42-1df3-4ebe-9f2c-82054ec321db` | repo-path `/home/alex/Desktop/dev/dirslides-correct`, other variables empty | 10:54:28 | 11:21:05 | 26m37s | 2 | check ok, critic ship 87 |
| Stress `f59b67ea-54db-4cfe-a8ba-a6397fd472ee` | repo-path `/home/alex/Desktop/dev/bookrender` (no root README, no live URL), monthly-budget `120` (under the 350 USD two-week minimum), positioning "Turn any long PDF into a narrated audiobook you can play offline." (a feature the repo does not have) | 10:54:28 | 11:17:17 | 22m49s | 2 | check ok, critic ship 86 |

Stage timing, both runs alike:

- gather: 1 to 2.5 minutes
- fit: 1.5 minutes
- write: 2 to 3 minutes
- design: 1 minute
- render: seconds
- page (opus): 6 to 7 minutes a round
- check: under 1 minute

The plan's estimate of 8 minutes a round holds.

## What worked

Verified from files, not from stage summaries:

- `facts.json` carries titleMax 50 and bodyMax 100 from developers.openai.com in both runs. The third-party 30 and 60 figures appear nowhere as caps.
- Product read found the live URL `https://instideck.com` with repo evidence (`server/wrangler.toml`, `CLAUDE.md`). Stress `profile.json` has no live URL.
- The stress plan handled all three edges with numbers and links: `~/.modpipes/runs/f59b67ea-54db-4cfe-a8ba-a6397fd472ee/stages/ad-plan/outputs/plan.md`.
  - The verdict is "do not advertise yet".
  - It names the positioning and repo mismatch.
  - It says to deploy first.
  - It shows 120 USD buys 4.8 days at the 25 USD official minimum.
  - It predicts 0.1 to 0.2 signups.
- The stress copywriter set every targetUrl to null. It flagged that the copy promises an unbuilt feature.
- render-creatives wrote five PNGs per run.
- The final reports have zero failed checks:
  - happy: 24 checks, 24 links, 0 dead
  - stress: 23 checks, 26 links, 0 dead
- The polish loop stop fired on ok plus ship in round 2 in both runs.
- The final happy page reads calm and clear. Evidence: a screenshot of step 3 with cards, copy buttons, cap counters and official badges at `kt6n75z/work/dbg/happy.png`.
- Both overviews state the right verdict, the creatives and the gate results.

## Defects

1. Round 1 failed page-check in both runs (2 of 2), for the same reasons. The cost was one extra opus round, about 7 minutes per run.
   - Evidence:
     - `~/.modpipes/runs/9f53bf42-1df3-4ebe-9f2c-82054ec321db/stages/page-check/rounds/1/report.json`
     - `~/.modpipes/runs/f59b67ea-54db-4cfe-a8ba-a6397fd472ee/stages/page-check/rounds/1/report.json`
   - Cause: the shared page contract names no Next control and no screen identity, so check.cjs guessed.
     - The round-1 pages had no `[data-next]`, and every click timed out.
     - No section label held "setup" or "tracking".
     - I reproduced the timeout with a Playwright probe on the stress round-1 page: zero visible `[data-next]`.
   - Second cause: a `navigator.clipboard` call inside the sandboxed frame logs a Permissions-policy console error.
   - Fix v1: the contract now gives each section.step a `data-screen` (product, audience, creatives, budget, setup, tracking, review). It also requires a `data-next` and a `data-back` control. Framed pages skip the clipboard call. **Unconfirmed.**
2. On the happy run, lazy images read `naturalWidth 0` on hidden screens in the round-1 sandbox check. Evidence: the happy round-1 report above, and `loading="lazy"` in `stages/page/rounds/1/page/index.html`.
   - Fix v2: the page prompt now requires eager images. **Unconfirmed.**
3. Copywriter and ad-plan both decided the tracking URL. They run side by side, so the two URLs disagreed.
   - The copywriter wrote `instideck.com/?…&utm_content=c1&utm_term={ad_id}`. Evidence: `stages/copywriter/outputs/creatives.json`.
   - The plan wrote `/chatgpt?utm_term=A` plus a campaign `query_string_template`.
   - The page chose the plan's URLs, so the conflict did not reach the user this time.
   - Fix v1: targetUrl carries no query string, and ad-plan owns tracking. **Unconfirmed.**
4. The happy overview says the sandboxed fallbacks were "not tested", yet page-check ran framed mode and passed. Evidence: `~/.modpipes/runs/9f53bf42-1df3-4ebe-9f2c-82054ec321db/stages/overview/outputs/overview.md`. **Not fixed.** The todo row says what to try.

The critic shipped round 1 in both runs (scores 84 and 82) while the checker failed. Requiring both gates in the loop stop is what caught the failures.

## Versions

- `pipeline-versions/v1.json`: contract selectors, framed clipboard rule, copywriter targetUrl. Voice audit 0 long sentences. Stored copy verified equal, loop stop present.
- `pipeline-versions/v2.json`: eager images. Same checks.
- The CLI warned that the server build (68ceb65) differs from the CLI build (ec248cb). The stored definition still matched the file after both updates.
- The plan stage's `gen.py` does not hold the v1 and v2 edits. Port them before you regenerate from the generator.

## Lessons recorded

- Real pipeline page table: the four round-1 failure causes.
- Real pipeline copywriter table: the tracking URL ownership.
- Tester table: stage timing and where the round-1 evidence lives.
- `lessons__pipeline_builder_todos`: confirm v1 and v2, and fix the overview line.
- None of the seven earlier todo rows concerned this pipeline.

## What the next tester should look at first

- Run once on dirslides-correct with v2. Pass when round 1's page-check report says ok true and the run ends in one round, about 18 minutes.
- Grep the fresh `toolkit/outputs/tools/check.cjs` for `data-screen` and `data-next`. The toolkit should now match on the contract instead of h2 text.
- Read the overview for the framed-mode sentence.
