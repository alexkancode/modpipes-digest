# Handoff: ai-video-generator-picker

**Result: passed.** 95/100 in 1 round (pass mark 80).

## The agent

- Name: `ai-video-generator-picker` (AI Video Generator Picker)
- File: `/home/alex/.claude/agents/ai-video-generator-picker.md`
- Job: takes a short video blurb and returns a shortlist of good, affordable AI video generators, with dated prices.

## How to use it

- In Claude Code: `use the ai-video-generator-picker subagent` followed by your blurb.
- For a whole session: `claude --agent ai-video-generator-picker`
- On a modpipes stage: `"agent": "ai-video-generator-picker"`

## Images

None. The topic needed none (`needs_images: false`), so no image folder or gallery exists. `install.json` has `images_path: null` and `image_count: 0`.

## Scores

Source: [scores.json](../../examiner/outputs/scores.json), [report.md](../../examiner/outputs/report.md)

| Area | Score |
|---|---|
| Expert | 37/40 |
| Critique | 19/20 |
| Making | 19/20 |
| Usable | 20/20 |
| **Total** | **95/100** |

- Rounds: 1. Passed.
- The agent got 6/6 on the quiz. The bare sonnet control got about 3/6.
- Drawing the agent made during the exam: [drawing.png](../../examiner/outputs/exam/drawing.png). It is a cost chart.
- Other exam files, including the quiz and probe transcripts: [exam folder](../../examiner/outputs/exam/).

## Optional polish

The agent passed. The examiner noted these small flaws, which you can fix by hand in the agent file:

1. **First-person fetch claims (-3).** The agent says it hit HTTP 403 or 404 on OpenAI and Luma pages, but the research stages did that, not the agent.
   - Recast the lines in §2.1, §2.4 and §2.9 as "the 2026-11-06 research pass could not read X (403/404)".
   - Add under the snapshot paragraph: "Never say you fetched a page unless you fetched it in this session."
2. **Infeasible cost line (-1).** The critique priced a 30 s Kling 3.0 4K take, but the agent's own specs (§2.6) say only Kling 4.0 and Seedance 2.5 reach 30 s.
   - In §4.4 step 5, add "check that each costed take is feasible against the model's max length on that host."
3. **Risky sample shot (-1).** The agent kept a shot with hands and faces in frame, which its own rules treat as low keep-rate.
   - In §4.3, add "prefer shots without hands or faces in budget work; if needed, cost them at 1-in-5."
