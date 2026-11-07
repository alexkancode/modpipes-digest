# User bible handoff: /tmp/ub-test/stress

## Where the bible is

- Version: 3 (`<meta name="bible-version">` and `#bible-version` in the banner)
- File: `docs/user-bible/user-bible-v3.html` (745,084 bytes)
- Latest alias: `docs/user-bible/latest.html`
- Commit: `e6489d9` on branch `main`, one commit made by the publish stage
- Nothing was pushed.

## How to open it

- From disk: open `user-bible-v3.html` in any browser. It is one self-contained file with no external requests.
- From a static host: upload the file as-is. Do not use GitHub's raw view, which shows the HTML source and not the rendered page.

## What the crawl captured

The crawl ran. It started `next dev --port 3737` with a placeholder Supabase URL, because the repo has no `.env` and no reachable Supabase. The server was stopped and the repo was left clean.

- 7 screens captured, each with a JPEG and an ARIA snapshot. All returned 200.
- Every screen redirected to `/login` because no session existed. Only `/login` shows its own content.
- The four `/itineraries/:id` screens used a placeholder id, so their images show the login page, not the real plan screens. The authenticated screens are not in the bible.

## Gate results

- Coverage: `ok: true`. All 12 checks passed, including no script, no external URLs, no horizontal overflow at 390 px, zero serious or critical axe violations, and size under 5 MB.
- Critic: `ship: false`, score 74.
  - Blocker: at 390 px the "All routes" table on the sitemap is still broken. Cells wrap mid-word (`lay/ou/t`, `/logi/n`). The same CSS hits the summary tables. Suggested fix: `table{min-width:40rem}` inside `.scroll`.
  - Notes: the banner says "7 of 7 screens captured" although all of them are the login redirect; `route-home` shows the sign-in image under plan-list text; the summary hides its Promises and Environment tables in closed details; `path-organiser-create-and-invite` visits the edit route three times.

## Open questions (from paths.json)

1. Which port and redirect URL should the app use: 3000, 3737 or 4000?
2. Where does a new developer get `SUPABASE_SERVICE_ROLE_KEY`?
3. Which document holds the feature spec?
4. Where should a signed-out visitor land after signing in from a deep link?
5. Should invited participants see the Edit page at all?
6. How does an invitee learn they were invited?
7. Who will deliver reminders, and through which channel?
8. Is `/itineraries/:id/view` meant to replace the front page or be deleted?
9. What happens with an invalid timezone on an activity?
10. Is the day-by-day grouping meant to show?
11. What does a removed participant see?
12. Should deleting an activity or removing a person ask for confirmation?
13. What should happen if the owner-row insert fails after a plan is created?

## Rerun

```
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start 184c7aff-d637-4879-be19-10eedb04ff61 --var repo-path=/tmp/ub-test/stress
```
