---
name: verifying-cx-web-in-browser
description: Drives a real logged-in Chromium session against a cx-web branch/stage/prod environment to verify a PR by hand — capturing network requests, flipping dark feature flags, and probing backend behavior — without ever handling credentials. Use when asked to verify a PR in the branch environment, check what params a page sends, confirm a feature flag's effect, test as a logged-in or premium user, or find out whether the backend actually supports a new query param. Not for writing committed Playwright specs.
allowed-tools: all
metadata:
  category: engineering
---

# Verifying cx-web in a real browser

Throwaway browser automation for checking that a change does what the ticket says, in a live
environment, as a real signed-in user.

This is deliberately not the committed E2E suite. The suite proves a feature keeps working. This
proves a PR works once, right now, so you can answer a reviewer or unblock a merge. Different goal,
different tooling, nothing gets committed.

If the task is "add coverage for X", stop and use `generating-e2e-tests` instead.

---

## Never ask for credentials

The repo mints its own test accounts. `e2e/config/stage-configs/.env.secrets` is gitignored and
already on the machine, and `@crunchyroll/account-provider` uses it to hand out a free or premium
account on demand. The `setup-free` and `setup-premium` Playwright projects log that account in over
SSO and write cookies to `e2e/.auth/`.

So you drive the setup and reuse the saved session. No username or password is ever typed, printed,
or pasted into a transcript.

If someone offers to share credentials, decline and point at this. If `.env.secrets` is genuinely
missing, ask them to copy it from a teammate or 1Password into
`e2e/config/<env>-configs/.env.secrets` in their own terminal. Do not read the file yourself. A
pre-tool hook blocks dotfile reads anyway, and it is right to.

---

## Setup

Everything runs from `e2e/`, never the repo root.

```sh
cd e2e
npx playwright install chromium        # once per machine; skip if .../ms-playwright exists
TEST_ENV=stage BASE_URL=<env-url> npx playwright test --project=setup-premium
```

`setup-premium` writes `e2e/.auth/premium.json`; `setup-free` writes `free.json`. `.auth/` is
gitignored. Sessions expire after a while — if a run suddenly looks signed-out, re-run setup before
debugging anything else.

`BASE_URL` overrides the per-env default. Branch environments follow
`https://cx-web-pr-<number>.branch.stage.crunchyroll.com` and talk to the
`https://stage.crunchyroll.com` API regardless of which branch env you're on.

Beware: the config's project names are `chromium`, `firefox`, `webkit`, `mobile-safari`. The
`running-e2e-tests` skill claims `--project=web`, which does not exist in this repo.

---

## Feature flags

Dark features live in a single `efg_state` cookie holding a JSON array of `[hash, value]` pairs. The
hashes are in `config/baseconfig.js` under `darkFeatureConfig.rolloutFeatures` and
`developmentFeatures`.

Do not try to write that cookie by hand. Encoding, domain and expiry are all easy to get subtly
wrong, and a wrong cookie fails silently as "flag is off". Click the toggle on `/feature` and let the
app write it, then save the state to a separate file.

The `/feature` page uses human labels, not flag keys. `languagePresentation` renders as "Language
Presentation". Each toggle is `role="switch"` with the label as its accessible name, so
`page.getByRole('switch', {name: 'Language Presentation'})` works and `aria-checked` tells you
whether it took.

`scripts/save-flagged-auth.mjs` in this skill does the whole thing. Copy it into `e2e/`, run it,
delete it.

```sh
cp ~/.copilot/skills/verifying-cx-web-in-browser/scripts/save-flagged-auth.mjs .
node save-flagged-auth.mjs --base=<env-url> --state=.auth/premium.json \
  --out=.auth/premium-lp.json --flag="Language Presentation"
rm save-flagged-auth.mjs
```

Keep one state file per flag combination and name it for the flag. Toggling in place makes later runs
depend on run order, which is how you end up debugging a flag that was already on.

---

## Capturing what a page sends

Listen for the request on a real navigation. Do not hand-roll `fetch` against the API — you'd have to
reproduce auth headers, and cross-origin credentialed fetches trip the credential-dump hook.

```js
const hits = [];
page.on('request', r => { if (/discover\/browse\?/.test(r.url())) hits.push(r.url()); });
await page.goto(BASE + path, {waitUntil: 'domcontentloaded'});
await page.waitForTimeout(6000);
hits.map(u => new URL(u).searchParams);
```

Collect every match rather than the first. Some routes fire the same endpoint twice with different
params, and the difference is often the bug. `/videos/alphabetical` hits both `discover/browse` and
`discover/browse/index`.

Use a fresh `browser.newContext({storageState})` per case. Client-side navigation between cases
skips requests you're trying to observe, and SSR'd first loads behave differently from client
refetches.

---

## Visual checks with mocked prerequisites

When an account lacks the subscription, consent, or other state needed to reach a UI,
use browser-local network interception before declaring the visual cases blocked. This tests
the deployed application's rendering and interactions, not whether the backend supports the
fixture. Keep live-backend and mocked-data results separate.

1. Read the target revision's eligibility selectors, API response transformers, and existing
   `e2e/support/` mocks. Identify every prerequisite, including pricing, billing cycle,
   primary profile, feature flags, and consent status. Reuse existing response contracts.
2. Keep real authentication. Never mock tokens, bypass login, inject Redux state, change
   application bundles, or alter the real account's billing or consent records. Enable
   flags through `/feature`, then save a separate auth state.
3. Define the case matrix and fixture provenance before running. Mock only the missing
   prerequisites, with explicit endpoint, method, response shape, and expected request counts.
   Use the smallest contract-valid payload. Use future dates where expiry affects eligibility.
4. Create a fresh context per case with the saved auth state and `serviceWorkers: 'block'`.
   Register routes before the first navigation. Use `context.route` so popups are covered.
   Match the expected API host, pathname, method, and policy/query parameters, not a broad
   URL substring. Assert that required mock routes were actually exercised.
5. Intercept every state-changing request belonging to the simulated workflow. Validate its
   payload and fulfill it locally. Unexpected methods or policies must fail the case without
   falling through to the real service. Intercept external store navigation before it leaves
   the context, record the attempted destination, and report this as a redirect-intent check,
   not successful store integration.
6. Model request lifecycle, not just a static success response. Hold a response until loading
   and duplicate-click assertions finish; release it explicitly. For retry, fail one request,
   assert the visible error and retained UI, then succeed the next request. Update the
   fixture's consent status after success so later reads are consistent.
7. Assert visible copy, card/modal removal, loading/disabled state, request count, and request
   payload as appropriate. Never force the DOM into the expected state. Save screenshots
   while transient feedback is visible. Capture errors without logging credentials, headers,
   account identifiers, or entire response bodies.
8. Label every case `MOCKED`, list intercepted endpoints and artificial fields, and state
   what remains unproven. A mocked UI pass cannot establish backend acceptance, geo behavior,
   real billing eligibility, or third-party store completion. Missing mock prerequisites are
   setup failures, not product failures. Preserve live-backend checks as separate cases.

Keep review-specific scripts temporary in `e2e/`; persist screenshots and redacted JSON results
in the session artifacts. Do not add committed E2E specs unless requested. If mocks cannot
reach a state without bypassing application logic, report it as not verified and explain why.

---

## Probing whether the backend supports a param

Sending a param proves nothing about whether anything reads it. Read the response and compare a count
across values.

Capture `total` (or `data.length`) for the unfiltered case, then for two or three filter values, then
for a deliberately invalid one. Identical totals everywhere means the backend is ignoring you. Moving
totals mean it works. The invalid case tells you whether bad input 400s or gets dropped, which
decides whether the client needs error handling.

Vary one param at a time first, then combine. Single-value baselines are what let you tell AND from
OR: if the two-filter total exceeds either single-filter total, the backend is unioning, and that is
worth raising with the API team before the UI ships.

---

## Cleanup

Scratch scripts go in `e2e/` because that's where `@playwright/test` resolves from — `/tmp` fails
with `ERR_MODULE_NOT_FOUND`. Delete them when done and confirm with `git status --porcelain`.
`.auth/` and `test-results/` are gitignored and can stay.

---

## Reporting

Lead with the verdict: does the change do what the ticket says, yes or no.

Put the per-case results in a table with the actual observed values, not "as expected". Someone
reading it later needs the numbers.

Call out anything you found that isn't in the ticket. Backend semantics, a route that behaves
differently, a param that goes missing on SSR. That's usually the most valuable output of a run like
this, and it's easy to drop on the floor while confirming the happy path.

Say plainly what you could not verify and why.

For mocked cases, include `MOCKED` in the case label and describe the fixture assumptions.
Report live and mocked pass/fail counts separately.
