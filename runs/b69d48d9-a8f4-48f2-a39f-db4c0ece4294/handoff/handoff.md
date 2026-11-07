# Handoff: pixel-art-polish-depth

Topic: what makes pixel art assets feel polished, like they have depth and beauty.

**Result: passed, 86/100 (pass mark 80), in 1 round.**

## The agent

- Name: `pixel-art-polish-depth`
- File: `/home/alex/.claude/agents/pixel-art-polish-depth.md`
- Installed: 2026-11-06T23:23:14

## How to use it

- In Claude Code, one task: say "use the pixel-art-polish-depth subagent to …"
- A whole session: `claude --agent pixel-art-polish-depth`
- On a modpipes stage: set `"agent": "pixel-art-polish-depth"` in the stage config.

## Reference images

- Folder: `/home/alex/.claude/agents/pixel-art-polish-depth-images/`
- Count: 16
- Gallery: `/home/alex/.claude/agents/pixel-art-polish-depth-images/index.md` (source page URL and direct URL for each image)

## Examiner scores (round 1 of 1)

| Area | Score | Max |
|---|---|---|
| Expert | 38 | 40 |
| Critique | 14 | 20 |
| Making | 14 | 20 |
| Usable | 20 | 20 |
| **Total** | **86** | 100 |

The agent passed. The full report is in [report.md](../../examiner/outputs/report.md). Raw scores are in [scores.json](../../examiner/outputs/scores.json). The probe transcripts and quiz are in [exam/](../../examiner/outputs/exam/).

Drawing the agent made during the exam: [drawing.png](../../examiner/outputs/exam/drawing.png) (160x96 native, shown at 6x).

## What the examiner still wants

The agent passed, but the examiner listed these fixes. They are optional. Edit the agent file by hand or rerun to apply them.

1. **Critique, light direction.** Section 5's note for file 14 repeats the caption's "one top-left light". The measured values say the cubes are lit from the upper right and the rocks from the left. Correct the note. Add to Method 1 step 3: sample one pixel on each visible face, compare the values, and state the implied light direction instead of trusting a caption.
2. **Making, make the final check a gate.** Method 4 step 6 should block delivery until the colour count is at or below the planned palette size, the greyscale thumbnail has been opened, and the light direction matches the light source's position.
3. **Making, shading rules in 4a.**
   - Place any visible sun, moon or lamp on the side the shading assumes.
   - Rim-light faces that turn toward a local light.
   - Build tree canopies as clumps lit from one side, not as discs with centred highlights.
4. **Making, palette budget.** Add about 24–32 colours for a scene. Make glows from existing ramp colours. The exam drawing used 55 colours.
5. **Expert, palette construction.** Explain how the cited palette's ramps add up to its total. Fetch the contents of Saint11's tutorial and AdamCYounis's ramp method, or keep marking them unread.

Keep: the `[contested]` and `[unverified]` tagging, a URL beside each fact, the provenance line, the audit command, and the Pass/Weak/Fail-per-trait format.
