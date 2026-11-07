# Handoff: steam-budget-viral-games

Topic: trending and viral Steam games under $5 over the last 4 years.

## Result

**PASSED** with 93/100 (pass mark 80) in 1 round. Installed 2026-11-06.

## The agent

- Name: `steam-budget-viral-games`
- File: `/home/alex/.claude/agents/steam-budget-viral-games.md`

### How to use it

- In Claude Code: say "use the steam-budget-viral-games subagent to ..."
- For a whole session: `claude --agent steam-budget-viral-games`
- On a modpipes stage: set `"agent": "steam-budget-viral-games"`

## Images

- 16 reference images in `/home/alex/.claude/agents/steam-budget-viral-games-images/`
- Gallery: [index.html](file:///home/alex/.claude/agents/steam-budget-viral-games-images/index.html)
- Index with source page and direct URLs: [index.md](file:///home/alex/.claude/agents/steam-budget-viral-games-images/index.md)

## Scores (examiner)

| Area | Score |
|---|---|
| Expert | 38/40 |
| Critique | 18/20 |
| Making | 17/20 |
| Usable | 20/20 |
| **Total** | **93/100** |

Details: lint ok. The agent scored 6/6 on the quiz, with both contested items hedged and each side named. The bare-sonnet control scored about 2/6.

- Report: [report.md](../../examiner/outputs/report.md)
- Scores: [scores.json](../../examiner/outputs/scores.json)
- Quiz: [quiz.md](../../examiner/outputs/exam/quiz.md)

## Drawing from the exam

[SOFA SO GOOD capsule (460x215)](../../examiner/outputs/exam/drawing.png)

![drawing](../../examiner/outputs/exam/drawing.png)

## What the examiner still wants

The agent passed, so these are optional improvements for a hand edit or a rerun:

1. **Expert (-2):** The knowledge rests almost wholly on Wikipedia, and press outlets are known by headline only. Add two or three fetched non-Wikipedia sources with dated facts: a developer interview or postmortem (poncle, Klubnika, Zeekerss), a Steam sale-event effect, and one SteamDB price history read by hand. Keep the fetched-vs-headline labels.
2. **Critique (-2):** The agent skipped its own 184x69 thumbnail test. Make the shrink test mandatory in Method 1 step 4 whenever readability is judged. Put a one-line Pillow command there (open, resize to (184,69), save to `/tmp/steam-budget-viral-games/thumb.png`, Read).
3. **Making (-3):** In the drawing the movers are cropped at the bottom edge and the staircase nearly vanishes. Add a self-check to Method 4B. After the thumbnail test, fix and re-render once if a named subject touches the canvas edge or a premise element has under 15% luminance difference from the background. Suggest a 10 px safe margin.
