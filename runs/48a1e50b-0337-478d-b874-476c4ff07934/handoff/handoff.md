# User bible handoff

## Where the bible is
- Version: 1
- File: `docs/user-bible/user-bible-v1.html` (repo-relative; 516,415 bytes)
- Latest alias: `docs/user-bible/latest.html`
- Absolute path: `/tmp/ub-test/happy/docs/user-bible/user-bible-v1.html`
- Commit: `094e9f4`, branch `liquid-eq`
- Nothing was pushed.

## How to open it
- Open the HTML file directly in a browser from disk. It is self-contained: no scripts, no external URLs.
- Or copy the file to any static host.
- GitHub's raw view shows the HTML source, not the rendered page.

## What the crawl captured
- Crawl ran against a throwaway Postgres container and the dev server on port 5173.
- 8 screens captured, all HTTP 200: `/`, `/fonts`, `/viz`, `/viz/mesh`, `/viz/raymarch`, `/viz/metaballs2d`, `/gallery`, `/upload`.
- The three `/viz/<technique>` canvases rendered black under headless WebGL, so they are marked blank.
- No extra pages were found beyond the seed list.
- Cleanup: the container, `.env` and gallery dir were removed. `git status` in the repo shows `?? node_modules`, which existed before the crawl.

## Gate results
- Coverage: `ok: true`. All 12 checks passed (no script, no external URL, no horizontal overflow at 390 px, no serious axe violations, and so on).
- Critic: ship `true`, score 82, blockers none.
- Critic notes to act on:
  - The banner says "screenshots captured: 0 of 6", which contradicts the page. Fix the counter.
  - Add a short intro on which persona to read first.
  - Identifiers break mid-word in narrow tables at 390 px.
  - The guest "shared link" arrival is a guess and should be marked as a hypothesis.

## Open questions (from paths.json)
1. Is the open, unauthenticated upload intended? Who removes an unwanted photo?
2. After uploading, does the contributor know to click 'Gallery' in the nav?
3. Which screen is meant to be the landing page: home or gallery?
4. What does a person see when saving a pick fails?
5. Should a search outage look different from 'No results'?
6. Why does the visualizer default to the Spotify source when it rarely has a preview?
7. How does a visitor recover after denying microphone permission?
8. Disagreement: features/site-nav/feature.md says the nav links Home and Fonts; the code links Gallery and Upload.
9. Disagreement: features/reveal-and-viz-nav/feature.md says a 'Viz' nav link was added; the code and test say there is none.
10. Disagreement: tests/e2e/smoke.spec.ts expects /health to return db ok, which needs a live Postgres.
11. Disagreement: the smoke test calls home a 'hello-world heading', but home now has a billboard and search.
12. Disagreement: README says React Router 7 and Stage 2, and lists four routes; the code runs React Router 8 with ten routes.
13. Disagreement: the billboard feature doc describes a 'top 6' ranking; no data feeds the cards.
14. Are uploaded photos kept across redeploys?
15. Is the gallery test meaningful when it accepts both the empty state and the slideshow?

## Rerun
```bash
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start 184c7aff-d637-4879-be19-10eedb04ff61 --var repo-path=/tmp/ub-test/happy
```
