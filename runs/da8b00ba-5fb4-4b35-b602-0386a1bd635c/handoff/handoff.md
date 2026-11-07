# Stripe billing handoff: Instideck (dirslides-correct)

Date: 2026-11-06

## Answer

One $5/month Instideck Pro subscription is fully built in code (Checkout, Billing Portal, 8-event webhook, KV entitlements) and the repo claims Stripe live mode since 2026-09-17, but the live Stripe account and production Worker secrets could not be checked in this run, so production readiness is not verified and the runbook's real-money test is still open.

## Capabilities

Every capability is `not-verifiable`: the code leg passes, but the live Stripe account and production Worker secrets could not be read (Stripe CLI live login expired).

- **Checkout (subscription)** — not-verifiable — `server/src/index.ts:78-99`: subscription-mode Checkout Session, one price, qty 1, 30 min expiry.
- **Subscriptions** — not-verifiable — `server/src/reconcile.ts:31-35`: active/trialing/past_due give Pro, every other status gives Free.
- **Webhooks** — not-verifiable — `server/src/index.ts:113-151`: raw-body signature check, livemode guard, event-id dedupe, 500 on failure.
- **Customer portal** — not-verifiable — `server/src/index.ts:101-111`: portal session with no configuration id, relies on the live default.
- **Entitlements** — not-verifiable — `server/src/entitlements.ts:20-35`: Cloudflare KV `ENTITLEMENTS`, written only by the webhook.
- **Revenue recovery** — not-verifiable — `server/src/reconcile.ts:31`: `past_due` keeps Pro; revocation relies on Stripe moving to unpaid/canceled.
- **Account activation** — not-verifiable — `features/launch-runbook/index.html:92` claims activation 2026-09-17; the only account id in the repo is the sandbox one (`DOCS.md:215`).

## Chosen tasks

Note: `tasks.json` from the checkpoint has `chosen: []` (mode pick), so no tasks were explicitly chosen. The writer and the site cover the required tasks t1 to t9 (the checkpoint answer was 'Required tasks only'). Tasks t10 to t13 are optional and have no steps; see verdict.md.

### t1. Re-authenticate the Stripe CLI and rerun this audit

Why: The expired live login blocked every live-object check

1. **Do:** In the Stripe Dashboard, switch to the live account and open Settings > Team and security > MCP and CLI access (https://dashboard.stripe.com/settings/mcp-and-cli-access). Turn CLI access on for live mode if it is off.
   **Expect:** CLI access shows as enabled for the live account and environment.
   Note: Stripe CLI versions newer than v1.50.0 need this setting. This machine runs 1.50.10, per the dossier.
   Source: https://docs.stripe.com/cli/login.md (fetched 2026-11-06)
2. **Do:** In your own terminal, start the browser login. Approve the pairing code in the Dashboard and grant live-mode access.
   ```bash
   stripe login --new-session
   ```
   **Expect:** The browser shows the same pairing code as the terminal. After you approve, the terminal reports that the login finished.
   Note: --new-session replaces the expired session. A plain stripe login keeps the current session. Stripe reauth only changes permissions on an existing session.
   Source: https://docs.stripe.com/cli/login.md (fetched 2026-11-06)
3. **Do:** List the accounts the CLI is authorized for.
   ```bash
   stripe login list
   ```
   **Expect:** The live Instideck account appears with live mode authorized, not only the sandbox acct_1Tv1…drg2.
   Source: https://docs.stripe.com/cli/login.md (fetched 2026-11-06)
4. **Do:** Rerun this audit so the account-inspector stage can read the live objects.
   ```bash
   /usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start 1f4d4bee-e2df-4df7-b616-43a64d0f630a --var repo-path=/home/alex/Desktop/dev/dirslides-correct --var question="What billing is set up, and is it production ready or still in staging?"
   ```
   **Expect:** The new run's assessment shows capabilities as live, sandbox-only or missing instead of not-verifiable.
   Note: The rerun command comes from this pipeline's config, not from Stripe docs. The source page covers the CLI login the rerun depends on.
   Source: https://docs.stripe.com/stripe-cli/keys.md (fetched 2026-11-06)

### t2. Confirm the account is activated with charges and payouts enabled

Why: Live payments need an activated account; the repo records only the sandbox account id

1. **Do:** Retrieve the live account.
   ```bash
   stripe get --live /v1/account
   ```
   **Expect:** JSON with charges_enabled: true, payouts_enabled: true and details_submitted: true.
   Note: If the command fails with an expired-key error, do t1 first.
   Source: https://docs.stripe.com/api/accounts/object.md (fetched 2026-11-06)
2. **Do:** In the same output, read requirements.currently_due, requirements.past_due and requirements.disabled_reason.
   **Expect:** Both lists are empty and disabled_reason is null. Anything listed there is what Stripe still needs before it pays out or charges.
   Source: https://docs.stripe.com/api/accounts/object.md (fetched 2026-11-06)
3. **Do:** Record the live account id (the id field from step 1) in DOCS.md beside the sandbox id. Ids are not keys, so this is safe.
   **Expect:** DOCS.md names both the sandbox account acct_1Tv1…drg2 and the live account.
   Note: The repo records only the sandbox account id today.
   Source: /home/alex/Desktop/dev/dirslides-correct/DOCS.md:215 (fetched 2026-11-06)

### t3. Confirm price_1UGiKTGZimDzWoEHYE1zB3S5 exists in live mode and is active

Why: Sandbox prices do not carry over; Checkout fails on a mode mismatch

1. **Do:** Retrieve the price the Worker uses, in live mode.
   ```bash
   stripe prices retrieve price_1UGiKTGZimDzWoEHYE1zB3S5 --live
   ```
   **Expect:** livemode: true, active: true, type: recurring, recurring.interval: month, unit_amount: 500. If the CLI says No such price, the id is sandbox-only, so continue with step 2. Otherwise this task is done.
   Note: The id comes from server/wrangler.toml:30.
   Source: https://docs.stripe.com/api/prices/retrieve.md (fetched 2026-11-06)
2. **Do:** Only if step 1 found no live price: in the live Dashboard, go to More > Product catalog, open the Instideck Pro product (create it if it is missing), and add a $5.00 USD monthly recurring price.
   **Expect:** The product shows an active $5.00 / month price. Copy its price_… id.
   Note: Sandbox prices do not carry over to live mode, and a price cannot be given a chosen id, so the live id will differ.
   Source: https://docs.stripe.com/products-prices/manage-prices.md (fetched 2026-11-06)
3. **Do:** Only if you did step 2: set STRIPE_PRICE_ID in server/wrangler.toml line 30 to the new id.
   ```bash
   STRIPE_PRICE_ID = "<price id from step 2>"
   ```
   **Expect:** wrangler.toml line 30 holds the live price id. Price ids are public, so this file is the right place.
   Source: /home/alex/Desktop/dev/dirslides-correct/server/wrangler.toml:30 (fetched 2026-11-06)
4. **Do:** Only if you did step 3: from server/, run the runbook's preflight, build and deploy chain.
   ```bash
   cd server && npm run preflight && cd .. && npm run preflight && npm run build && cd server && npx wrangler deploy
   ```
   **Expect:** Wrangler prints the deployed version and the instideck.com routes.
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:137-140 (fetched 2026-11-06)

### t4. Confirm the live webhook endpoint is enabled with the 8 events and note its API version

Why: Entitlements depend on it, and its payload version may differ from the SDK pin

1. **Do:** List the live webhook endpoints.
   ```bash
   stripe webhook_endpoints list --live
   ```
   **Expect:** One endpoint with url https://instideck.com/api/stripe-webhook, status: enabled and livemode: true. If none exists, go to step 4.
   Source: https://docs.stripe.com/api/webhook_endpoints/object.md (fetched 2026-11-06)
2. **Do:** Compare that endpoint's enabled_events with HANDLED_EVENTS in server/src/reconcile.ts.
   **Expect:** enabled_events holds all 8: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, invoice.paid, invoice.payment_failed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted.
   Note: Add any missing event in Workbench > Webhooks > the endpoint > edit events. A missing customer.subscription.deleted leaves cancelled users on Pro.
   Source: /home/alex/Desktop/dev/dirslides-correct/server/src/reconcile.ts:4-13 (fetched 2026-11-06)
3. **Do:** Note the endpoint's api_version. If it is null, the endpoint uses the account default version.
   **Expect:** You have a written version string to compare with the version stripe-node 18.5.0 pins (server/package.json) and the newest GA version, 2026-10-28.endive.
   Note: Webhook payloads follow the version set when the endpoint was created, else the account default.
   Source: https://docs.stripe.com/api/versioning.md (fetched 2026-11-06)
4. **Do:** Only if step 1 found no live endpoint: in the live Dashboard, open Workbench > Webhooks (https://dashboard.stripe.com/webhooks), add an endpoint for https://instideck.com/api/stripe-webhook, and select the 8 events from step 2.
   **Expect:** The endpoint page shows the URL, status enabled, and a signing secret starting whsec_.
   Note: Each endpoint has its own signing secret, so step 5 is required.
   Source: https://docs.stripe.com/webhooks.md (fetched 2026-11-06)
5. **Do:** Only if you did step 4: click Reveal secret on the new endpoint, then store it on the Worker from server/ and paste it at the prompt.
   ```bash
   cd server && npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
   **Expect:** Wrangler reports that the secret STRIPE_WEBHOOK_SECRET was uploaded to the dirslides Worker.
   Note: Paste the value only at the wrangler prompt. Never put it in .dev.vars, CREDENTIALS.md, any other repo file, or a chat.
   Source: https://docs.stripe.com/webhooks.md (fetched 2026-11-06)

### t5. Confirm Worker secrets STRIPE_SECRET_KEY (live) and STRIPE_WEBHOOK_SECRET (live endpoint) are set

Why: Production config is the third leg of live and is unchecked

1. **Do:** From server/, confirm that wrangler is logged into the Cloudflare account that owns the dirslides Worker.
   ```bash
   cd server && npx wrangler whoami
   ```
   **Expect:** The account id starts 1080 and ends c2136cc915, matching DOCS.md section 8.
   Note: Run npx wrangler login first if it says you are not authenticated.
   Source: /home/alex/Desktop/dev/dirslides-correct/server/wrangler.toml:1 (fetched 2026-11-06)
2. **Do:** List the Worker's secret names. Cloudflare shows names only, never values.
   ```bash
   cd server && npx wrangler secret list
   ```
   **Expect:** Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are listed.
   Source: /home/alex/Desktop/dev/dirslides-correct/server/wrangler.toml:33-35 (fetched 2026-11-06)
3. **Do:** Check the key's mode by its behaviour. Sign in at https://instideck.com and click upgrade to open Checkout, but do not pay.
   **Expect:** A Stripe Checkout page opens for $5.00 per month. An error instead of Checkout means the Worker key and the live price are in different modes.
   Note: Secrets are write-only, so behaviour is the only safe read-back.
   Source: /home/alex/Desktop/dev/dirslides-correct/server/src/index.ts:78-99 (fetched 2026-11-06)
4. **Do:** List the newest live Checkout Session.
   ```bash
   stripe checkout sessions list --live --limit 1
   ```
   **Expect:** The newest session was created a moment ago, with livemode: true. That proves the Worker holds a live key.
   Note: unverified: this checks the session list, and no fetched page documents that list. The cited page is the closest fetched source.
   Source: https://docs.stripe.com/api/accounts/object.md (fetched 2026-11-06)
5. **Do:** Check the webhook secret by its behaviour: in live Workbench > Webhooks, open the instideck.com endpoint and look at recent event deliveries.
   **Expect:** Deliveries return 200. Repeated 400 responses mean signature verification is failing because the Worker holds the wrong whsec_, so redo t4 step 5 with the secret from Reveal secret.
   Note: Before any live traffic exists there may be no deliveries. t8 step 3 makes this check final.
   Source: https://docs.stripe.com/webhooks/signature.md (fetched 2026-11-06)
6. **Do:** Only if step 4 showed no live session: put the live restricted key on the Worker and paste it at the prompt.
   ```bash
   cd server && npx wrangler secret put STRIPE_SECRET_KEY
   ```
   **Expect:** Wrangler reports that STRIPE_SECRET_KEY was uploaded. Repeat steps 3 and 4 and expect a live session.
   Note: Paste the value only at the wrangler prompt. Never put it in .dev.vars, CREDENTIALS.md, any other repo file, or a chat. Use an rk_live_ key, not sk_test_.
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:137 (fetched 2026-11-06)

### t6. Confirm a default Billing Portal configuration exists in live mode

Why: The portal call passes no configuration id and fails without a default

1. **Do:** List the live customer portal configurations.
   ```bash
   stripe get --live /v1/billing_portal/configurations
   ```
   **Expect:** At least one configuration with is_default: true and active: true.
   Note: POST /api/portal passes no configuration id (server/src/index.ts:101-111), so it relies on the default.
   Source: https://docs.stripe.com/api/customer_portal/configurations/list.md (fetched 2026-11-06)
2. **Do:** In the default configuration, read features.subscription_cancel.enabled, features.payment_method_update.enabled and default_return_url.
   **Expect:** Both features are enabled: true and default_return_url is https://instideck.com, as the runbook specifies.
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:130 (fetched 2026-11-06)
3. **Do:** Only if there is no default, or step 2 differs: open the live portal settings at https://dashboard.stripe.com/settings/billing/portal, allow cancellation and payment-method updates, set the redirect link to https://instideck.com, and save.
   **Expect:** Repeat step 1. It now shows a default configuration with those settings.
   Source: https://docs.stripe.com/customer-management/configure-portal.md (fetched 2026-11-06)

### t7. Confirm the Smart Retries final action cancels or marks unpaid

Why: past_due keeps Pro with no limit in code

1. **Do:** In live mode, open Billing > Revenue recovery > Retries (https://dashboard.stripe.com/revenue_recovery/retries).
   **Expect:** The subscription retry schedule and the action taken after the last retry are shown.
   Source: https://docs.stripe.com/billing/revenue-recovery/smart-retries.md (fetched 2026-11-06)
2. **Do:** Set the action after all retries fail to Cancel the subscription (or Mark the subscription as unpaid), then save.
   **Expect:** The setting reads cancel (or unpaid), not leave past-due.
   Note: server/src/reconcile.ts:31 grants Pro while past_due, so leave past-due keeps Pro forever. Both canceled and unpaid revoke Pro. Changes affect future retries only.
   Source: https://docs.stripe.com/billing/revenue-recovery/smart-retries.md (fetched 2026-11-06)

### t8. Run the real-money test: buy, check Pro, cancel, refund, check Free

Why: The runbook says it has not been done and there are no live customers yet

1. **Do:** With a real card, buy Pro on https://instideck.com.
   **Expect:** Checkout succeeds and the app shows the Pro badge within its polling window.
   Note: Do t3 to t6 first. This charges $5.00 of real money, which step 6 refunds.
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:152-155 (fetched 2026-11-06)
2. **Do:** In browser devtools > Network, open the response of GET /api/me.
   **Expect:** The body contains "plan":"pro".
   Source: /home/alex/Desktop/dev/dirslides-correct/server/src/index.ts:73-76 (fetched 2026-11-06)
3. **Do:** In the live Dashboard, open Workbench > Webhooks > the instideck.com endpoint, and the new subscription under Subscriptions.
   **Expect:** The subscription is active, and every delivery for this purchase returned 200.
   Source: https://docs.stripe.com/webhooks.md (fetched 2026-11-06)
4. **Do:** On the Subscriptions page (https://dashboard.stripe.com/subscriptions), open the test subscription's overflow menu (⋯) > Cancel subscription and choose immediately.
   **Expect:** The subscription status is canceled, and a customer.subscription.deleted delivery returns 200.
   Note: Do not cancel in the portal. It cancels at period end, so Pro would stay on for the month.
   Source: https://docs.stripe.com/billing/subscriptions/cancel.md (fetched 2026-11-06)
5. **Do:** Reload the app and check GET /api/me again.
   **Expect:** The Pro badge is gone and the body contains "plan":"free".
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:161 (fetched 2026-11-06)
6. **Do:** On the Payments page (https://dashboard.stripe.com/payments), open the $5.00 payment's overflow menu (⋯) > Refund payment and issue a full refund.
   **Expect:** The payment shows as refunded. The plan stays free because cancellation, not the refund, revoked access.
   Source: https://docs.stripe.com/refunds.md (fetched 2026-11-06)

### t9. Roll the restricted live key

Why: The runbook says the key was pasted into a chat transcript

1. **Do:** In live mode, open the API keys page (https://dashboard.stripe.com/apikeys). On the restricted key the Worker uses, open the overflow menu (⋯) > Rotate key, pick an expiration later than Now (for example 1 day), and click Rotate API key.
   **Expect:** Stripe shows the replacement rk_live_ key once. The old key keeps working until the expiration you picked.
   Note: Rotate after t8 finishes, as the runbook says. In Add a note, record where you stored the key, never the key itself.
   Source: https://docs.stripe.com/keys.md (fetched 2026-11-06)
2. **Do:** Store the replacement key on the Worker from server/ and paste it at the prompt.
   ```bash
   cd server && npx wrangler secret put STRIPE_SECRET_KEY
   ```
   **Expect:** Wrangler reports that STRIPE_SECRET_KEY was uploaded to the dirslides Worker.
   Note: Paste the value only at the wrangler prompt. Never put it in .dev.vars, CREDENTIALS.md, any other repo file, or a chat.
   Source: /home/alex/Desktop/dev/dirslides-correct/features/launch-runbook/index.html:167 (fetched 2026-11-06)
3. **Do:** Repeat t5 steps 3 and 4 to prove the Worker uses the new key.
   ```bash
   stripe checkout sessions list --live --limit 1
   ```
   **Expect:** A new live session appears, created after the rotation.
   Note: unverified: the session-list check is not on the cited page, which covers rotation.
   Source: https://docs.stripe.com/keys.md (fetched 2026-11-06)
4. **Do:** On the API keys page, open the old key's overflow menu (⋯) > View request logs.
   **Expect:** No requests from the old key since the secret put in step 2.
   Source: https://docs.stripe.com/keys.md (fetched 2026-11-06)
5. **Do:** If the old key has not expired on its own, open its overflow menu (⋯) > Expire key and confirm.
   **Expect:** Only the replacement restricted key remains on the API keys page.
   Source: https://docs.stripe.com/keys.md (fetched 2026-11-06)

## Open risks (from verdict.md)

- Google OAuth consent screen is in Testing mode (`CLAUDE.md:63`). Only listed test users can sign in and reach checkout, so the public cannot buy even if Stripe is live.
- Stale and conflicting docs. `CREDENTIALS.md` (last verified 2026-09-08) says everything is test mode. `README.md:68-75` says to register two events. `DOCS.md:196` gives workers.dev as the live URL.
- Entitlement drift detection was removed with the admin dashboard (`features/dashboard-removal/feature.md:45-49`). Nothing notices if KV and Stripe disagree.
- Refunds do not revoke access (`CLAUDE.md:95-100`). By design, but it relies on a manual "cancel first" procedure.
- No CI. Deploys and secret changes are manual from one machine, so there is no record of which key mode was last put.
- Non-atomic KV dedupe and inline reconcile before the 2xx. Harmless today, bugs if reconcile gains side effects.
- Optional tasks t10 to t13 (dispute and email settings, old workers.dev endpoint, unpinned apiVersion three majors behind 2026-10-28.endive, missing idempotency keys) are not covered by steps.

## Not verifiable in this run

Per readiness.json (checked 2026-11-06, Stripe CLI 1.50.10): live login failed with "your live mode API key needs to be re-configured"; no sandbox profile exists; no account was read. Production Worker secrets were unreadable because no `CLOUDFLARE_API_TOKEN` is set in a non-interactive shell.

| Not verified | Command that would fix it |
|---|---|
| Stripe CLI live login (blocks all items below) | `stripe login --new-session` |
| Account activation, charges and payouts (account-activation) | `stripe get --live /v1/account` |
| Live price exists and is active (checkout) | `stripe prices retrieve price_1UGiKTGZimDzWoEHYE1zB3S5 --live` |
| Live webhook endpoint, 8 events, API version (webhooks) | `stripe webhook_endpoints list --live` |
| Worker secrets set (webhooks, subscriptions) | `cd server && npx wrangler secret list` (needs `wrangler login` or a `CLOUDFLARE_API_TOKEN`) |
| Default portal configuration (customer-portal) | `stripe get --live /v1/billing_portal/configurations` |
| Smart Retries final action (revenue-recovery) | Dashboard only: Billing > Revenue recovery > Retries (t7) |
| Entitlements fed by a live endpoint | Follows from the webhook check, then the real-money test (t8) |

## Quality gate

- Site report ok: **false**. The only failing check is "one section per chosen task": expected [] got t1 to t9, because `tasks.json` has `chosen: []`. All 20 other checks pass, including no key material and no external requests.
- Billing critic: **pass** (no blockers). Open, non-blocking: Dashboard URLs the writer added are generic paths; t5 step 4 and t9 step 3 are marked unverified, and https://docs.stripe.com/api/checkout/sessions/list.md would be a better source.
- UX critic: **pass**, score **86**, no blockers. Non-blocking: 38 steps over nine tasks is a long scroll; mobile was not re-viewed in the last round.
- Blocker left after the last round: none from either critic. The one remaining failure is the empty `chosen` list upstream in the checkpoint.

## Rerun

```bash
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start 1f4d4bee-e2df-4df7-b616-43a64d0f630a --var repo-path=/home/alex/Desktop/dev/dirslides-correct --var question="What billing is set up, and is it production ready or still in staging?"
```
