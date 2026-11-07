# Handoff: Stripe billing audit of /tmp/sbd-stress-repo

Date: 2026-11-06

## Answer

Real customers cannot pay yet: the repo has no Stripe integration at all, despite README.md:3, so the order is to rotate the leaked live key, confirm the Stripe account is activated, build and test Checkout plus webhooks in a sandbox, then recreate products, prices and the webhook endpoint in live mode and set the live key and ids in production.

Order of all tasks: t1 rotate key, t2 confirm account activation, t3 choose provider and add SDK, t4 build sandbox checkout, t5 verified webhook handler, t6 sandbox tests, t7 live objects and production config, t8 fix README, t9 customer portal. You chose t1, t3, t8 and t9. The pipeline explains and instructs; it performs none of them.

## Capabilities

- **Stripe integration**: missing. Strongest evidence: `src/app.js:1` says "Payments are planned. Today the app only tracks invoices locally."; `package.json:1` has `"dependencies":{}` and no scripts.
- **Account activation**: not-verifiable. Strongest evidence: readiness.json (2026-11-06) shows live false, sandbox false, account null because the live CLI key expired.

## Chosen tasks

### t1. Rotate the committed live key and replace it with a placeholder

Why: A sk_live_ value is committed in .env.example:1; if real, anyone with the repo can move money.

1. **Do:** In the Stripe Dashboard in live mode, open Developers > API keys, find the secret key ending …AbCd, open its overflow menu (⋯) and select View request logs.
   - **Expect:** Workbench opens the request log for that key. No requests means nothing uses it; any requests show which servers you must move to the new key.
   - **Source:** https://docs.stripe.com/keys.md#view-request-logs (fetched 2026-11-06)
   - **Note:** The key is committed at .env.example:1 in commit 801e6c5. Treat it as compromised whatever the logs show.

2. **Do:** On the same API keys page, open the overflow menu (⋯) for the key ending …AbCd, select Rotate key, set Expiration to Now, and click Rotate API key.
   - **Expect:** The old key is revoked and Stripe shows the replacement secret key once. Copy it straight into a password manager or your host's secret store.
   - **Source:** https://docs.stripe.com/keys.md#rolling-keys (fetched 2026-11-06)
   - **Note:** Choose Now unless the request logs showed live traffic. If they did, pick a short expiry and finish step 3 first. Both keys then work for up to 7 days. Never paste the new key into any file in the repo.

3. **Do:** Store the replacement key as STRIPE_SECRET_KEY in your hosting platform's secret store. The repo does not name a host, so use your host's secret command, which prompts for the value.
   - **Command:**

```sh
npx wrangler secret put STRIPE_SECRET_KEY
```

   - **Expect:** The host lists STRIPE_SECRET_KEY as a secret, for example in npx wrangler secret list, and the value never appears in the repo.
   - **Source:** https://docs.stripe.com/keys.md#protect-your-keys (fetched 2026-11-06)
   - **Note:** The command shown is for Cloudflare Workers. Railway, Fly and Vercel each have their own secrets command. Keys.md recommends a restricted key (rk_live_) over a full secret key.

4. **Do:** Check that the leaked key is dead. Run one read-only request with it and paste the old key only at the prompt.
   - **Command:**

```sh
read -rs OLD_KEY && curl -s https://api.stripe.com/v1/balance -u "$OLD_KEY:"; unset OLD_KEY
```

   - **Expect:** Stripe returns an authentication error, or invalid_request_error if the key was never valid. No balance object is returned.
   - **Source:** https://docs.stripe.com/keys.md (fetched 2026-11-06)
   - **Note:** If a balance object comes back, the key still works. Go back to step 2 and set Expiration to Now.

5. **Do:** Replace the committed value in .env.example with a placeholder that holds no key material.
   - **Command:**

```sh
sed -i 's/^STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=<sandbox sk_test_ or rk_test_ key, set outside git>/' .env.example
```

   - **Expect:** Running grep -c sk_live_ .env.example prints 0.
   - **Source:** .env.example:1 (fetched 2026-11-06)

6. **Do:** Add ignore rules so real env files can never be committed.
   - **Command:**

```sh
printf '.env\n.env.*\n!.env.example\n.dev.vars\n' >> .gitignore
```

   - **Expect:** Running git check-ignore .env prints .env.
   - **Source:** https://docs.stripe.com/keys.md#protect-your-keys (fetched 2026-11-06)
   - **Note:** Keys.md says not to put keys in configuration files checked into version control.

7. **Do:** Commit the placeholder and the ignore rules.
   - **Command:**

```sh
git add .env.example .gitignore && git commit -m "Remove committed Stripe key; ignore env files"
```

   - **Expect:** git show --stat HEAD lists .env.example and .gitignore.
   - **Source:** .env.example:1 (fetched 2026-11-06)
   - **Note:** The old key stays in commit 801e6c5. Rotation makes it useless, so rewriting history is optional. Run git log --all -S sk_live_ --oneline to list the commits that contain it, without printing the value.

### t3. Choose the payment provider and add the Stripe SDK

Why: No stripe package or start script exists, and PAYPAL_CLIENT_ID conflicts with the Stripe-only README.

1. **Do:** Choose Stripe as the only payment provider and delete the unused PayPal variable from the env template.
   - **Command:**

```sh
sed -i '/^PAYPAL_CLIENT_ID=/d' .env.example
```

   - **Expect:** Running grep -c PAYPAL .env.example prints 0.
   - **Source:** .env.example:2 (fetched 2026-11-06)
   - **Note:** README.md:3 describes Stripe-only billing. If you do want PayPal, keep the line and update the README in task t8 instead.

2. **Do:** Check the Node.js version. The Stripe Node SDK needs Node 18 or newer.
   - **Command:**

```sh
node --version
```

   - **Expect:** The output shows v18 or higher.
   - **Source:** https://docs.stripe.com/get-started/development-environment.md?lang=node (fetched 2026-11-06)
   - **Note:** The Node quickstart names stripe-node v23.0.0 as the latest release.

3. **Do:** Install the Stripe Node SDK in the repo root.
   - **Command:**

```sh
npm install stripe --save
```

   - **Expect:** package.json lists stripe under dependencies, and package-lock.json is created.
   - **Source:** https://docs.stripe.com/get-started/development-environment.md?lang=node (fetched 2026-11-06)

4. **Do:** Mark the package as an ES module so that the export syntax in src/app.js loads.
   - **Command:**

```sh
npm pkg set type=module
```

   - **Expect:** package.json contains "type": "module".
   - **Source:** src/app.js:2 (fetched 2026-11-06)

5. **Do:** Add the start script that README.md:7 tells deployers to run.
   - **Command:**

```sh
npm pkg set scripts.start="node src/server.js"
```

   - **Expect:** npm pkg get scripts.start prints "node src/server.js".
   - **Source:** README.md:7 (fetched 2026-11-06)
   - **Note:** src/server.js does not exist yet. You create it when you build checkout (task t4). Until then npm start fails with a missing-module error.

6. **Do:** Create one shared Stripe client that reads the key from the environment and pins the API version explicitly.
   - **Command:**

```sh
cat > src/stripe.js <<'EOF'
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-10-28.endive',
});
EOF
```

   - **Expect:** src/stripe.js exists, contains no key, and pins apiVersion '2026-10-28.endive'.
   - **Source:** https://docs.stripe.com/upgrades.md (fetched 2026-11-06)
   - **Note:** 2026-10-28.endive is the newest version in facts.json (2026-11-06). Without apiVersion, stripe-node uses the version that was newest when the SDK shipped.

7. **Do:** Load a sandbox secret key into your shell only, without writing it to any file. Copy it from the Dashboard's API keys page while a sandbox is selected.
   - **Command:**

```sh
read -rs STRIPE_SECRET_KEY && export STRIPE_SECRET_KEY
```

   - **Expect:** Running echo ${STRIPE_SECRET_KEY:0:8} prints sk_test_ or rk_test_.
   - **Source:** https://docs.stripe.com/keys.md (fetched 2026-11-06)
   - **Note:** Use sandbox keys while you build and test. Live keys go only into the host secret store (task t1 step 3).

8. **Do:** Make one read-only call through the new client to prove the SDK, key and version work together.
   - **Command:**

```sh
node --input-type=module -e "import { stripe } from './src/stripe.js'; const b = await stripe.balance.retrieve(); console.log('livemode', b.livemode)"
```

   - **Expect:** The output is livemode false.
   - **Source:** https://docs.stripe.com/get-started/development-environment.md?lang=node (fetched 2026-11-06)
   - **Note:** An authentication error means the shell variable is missing or holds the wrong key. Repeat step 7.

### t8. Correct README.md and the deploy instructions

Why: README.md:3 claims live billing that does not exist, and README.md:7 points to a start script that does not exist.

1. **Do:** Replace the false claim on README.md line 3 with the real status.
   - **Command:**

```sh
sed -i '3s/.*/Tallyho is a small invoicing app. Stripe billing is in development and not live yet; customers cannot pay today./' README.md
```

   - **Expect:** Running grep -c 'live in production' README.md prints 0.
   - **Source:** README.md:3 (fetched 2026-11-06)
   - **Note:** src/app.js:1 says payments are planned, and the audit found no Stripe code.

2. **Do:** Replace the Deploy section (README.md lines 5 to 7) with the full list of production settings that live billing needs.
   - **Command:**

```sh
sed -i '5,$d' README.md && cat >> README.md <<'EOF'
## Deploy

Set these in the host's secret store, never in a committed file:

- `STRIPE_SECRET_KEY`: live restricted (`rk_live_`) or secret (`sk_live_`) key.
- `STRIPE_WEBHOOK_SECRET`: the `whsec_` signing secret of the live webhook endpoint (each endpoint has its own).
- `STRIPE_PRICE_ID`: the live monthly price id. Sandbox price ids do not exist in live mode.

Then run `npm install` and `npm start`.
EOF
```

   - **Expect:** README.md ends with a Deploy section that names STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_ID.
   - **Source:** https://docs.stripe.com/get-started/checklist/go-live.md (fetched 2026-11-06)
   - **Note:** Before task t3 step 5 is done, npm start has no script to run (package.json:1).

3. **Do:** Add a short go-live section so nobody marks billing live again before the checklist is done.
   - **Command:**

```sh
cat >> README.md <<'EOF'

## Going live

Billing counts as live only when the live price, the live webhook endpoint and its secret, and the live key are all set in production. Follow https://docs.stripe.com/get-started/checklist/go-live before changing the status line above.
EOF
```

   - **Expect:** README.md has a Going live section that links the go-live checklist.
   - **Source:** https://docs.stripe.com/get-started/checklist/go-live.md (fetched 2026-11-06)

4. **Do:** Commit the README changes.
   - **Command:**

```sh
git add README.md && git commit -m "README: state real billing status and deploy settings"
```

   - **Expect:** git show --stat HEAD lists README.md only.
   - **Source:** README.md:3 (fetched 2026-11-06)

### t9. Add a customer portal for cancel and payment-method updates

Why: Monthly customers need a self-serve way to cancel or update their card.

1. **Do:** In the Dashboard with a sandbox selected, open Settings > Billing > Customer portal. Turn on Cancel subscription, Cancellation reason, Payment methods and Invoice history, then click Save.
   - **Expect:** The page confirms that the settings are saved, and Preview shows the cancel and payment-method options.
   - **Source:** https://docs.stripe.com/customer-management/configure-portal.md (fetched 2026-11-06)
   - **Note:** Sandboxes and live mode keep separate portal configurations (see step 6).

2. **Do:** Confirm the sandbox portal configuration with a read-only CLI call.
   - **Command:**

```sh
stripe billing_portal configurations list --limit 3
```

   - **Expect:** The output holds one configuration with "is_default": true and "livemode": false.
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md (fetched 2026-11-06)
   - **Note:** The error "no config for that project was found" means the CLI has no sandbox key. Run stripe login in your own terminal first.

3. **Do:** Add the server code that creates a portal session for a signed-in customer.
   - **Command:**

```sh
cat > src/portal.js <<'EOF'
import { stripe } from './stripe.js';

// Call only after you authenticate the user. customerId is the cus_ id stored for that user.
export async function createPortalSession(customerId, returnUrl) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
EOF
```

   - **Expect:** src/portal.js exists and imports the shared client from src/stripe.js (task t3 step 6).
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md (fetched 2026-11-06)
   - **Note:** Mount a POST /create-customer-portal-session route in src/server.js (built in task t4) that calls this function and redirects to the URL. Each portal session URL is short-lived.

4. **Do:** Subscribe the sandbox webhook endpoint to the portal events: customer.subscription.updated, customer.subscription.deleted, customer.subscription.paused, customer.subscription.resumed and customer.updated. In the Dashboard, open Workbench > Webhooks, choose the endpoint and edit its events.
   - **Expect:** The endpoint's event list includes all five events.
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md#listen-to-webhooks (fetched 2026-11-06)
   - **Note:** The handler from task t5 must revoke access on customer.subscription.deleted and paused, and restore access on resumed.

5. **Do:** Test the portal on a sandbox customer that has a subscription: open the customer's page in the Dashboard, then click Actions > Open customer portal.
   - **Expect:** The portal opens and shows the subscription, a Cancel option and an Update payment method option.
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md#preview-and-test (fetched 2026-11-06)

6. **Do:** Turn off View test data, open Settings > Billing > Customer portal in live mode, apply the same settings as step 1, and click Save.
   - **Expect:** The live portal settings are saved.
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md#launch-the-portal (fetched 2026-11-06)
   - **Note:** Do this only after the live account, price and webhook endpoint exist (tasks t2 and t7).

7. **Do:** Confirm the live portal configuration with a read-only CLI call.
   - **Command:**

```sh
stripe billing_portal configurations list --live --limit 3
```

   - **Expect:** The output holds one configuration with "is_default": true and "livemode": true.
   - **Source:** https://docs.stripe.com/customer-management/integrate-customer-portal.md#launch-the-portal (fetched 2026-11-06)
   - **Note:** The error "your live mode API key needs to be re-configured" means the CLI login expired. Run stripe login in your own terminal.

## Open risks

- **Hidden billing service.** README.md:3 may describe billing that runs outside this repo. If a live account already has customers and subscriptions, building t4 to t7 could charge customers twice. Confirm the account (t2) and run `stripe subscriptions list --live` before building anything.
- **Key in git history.** Rotating the key (t1) does not remove the value from commit `801e6c5`. Any clone or fork still holds it, so treat the old key as permanently exposed.
- **Unknown host.** No deploy config exists (no wrangler.toml, Dockerfile or CI), so production secrets cannot be checked. Webhook raw-body handling depends on the runtime (`constructEventAsync` on Workers).
- **Tax, receipts and invoicing.** Local invoices (`src/app.js:2`) are not tied to Stripe invoices. Sales tax and Stripe-hosted invoicing are out of scope here (unverified).
- **API version drift.** A future SDK upgrade crosses majors listed in facts.json, such as the billing_cycle_anchor change in 2026-09-30.endive.

## Not verifiable in this run

- **Live account state (activation, existing customers and subscriptions).** The live CLI key expired: "your live mode API key needs to be re-configured". Fix: `stripe login`, then `stripe get /v1/account` and check charges_enabled and details_submitted.
- **Sandbox state (products, prices, webhook endpoints, portal configuration).** No sandbox profile: "no config for that project was found". Fix: `stripe login --project-name=live` as the CLI message states, or add a sandbox profile, then rerun the preflight reads such as `stripe billing_portal configurations list --limit 3`.
- **Account activation capability** (not-verifiable): the same `stripe login` fix, then `stripe get /v1/account`.
- **Production host and secrets.** No deploy config in the repo; check the host's own secret list (for example `npx wrangler secret list` if it is Cloudflare Workers; the host is unconfirmed).
- **Whether the committed key is real or active.** Step t1.4 tests it without printing it: `read -rs OLD_KEY && curl -s https://api.stripe.com/v1/balance -u "$OLD_KEY:"; unset OLD_KEY`.

## Quality gate

- Site report (site-check): ok = true, all 20 checks passed.
- Billing critic: pass = true, blockers none (round 2).
- UX critic: pass = true, score 84, blockers none.
- Blockers left after the last round: none.
- Style notes left open: the verdict sentence is long (about 60 words); task sections have no "N steps" line; repo sources render as file:/// URLs.

## Rerun

```sh
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start 1f4d4bee-e2df-4df7-b616-43a64d0f630a --var repo-path=/tmp/sbd-stress-repo --var question="Which steps remain before real customers can pay, and in what order?"
```
