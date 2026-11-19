# verifying-cx-web-in-browser

Verify a cx-web PR by hand in a live branch, stage, or prod environment, signed in
as a real free or premium test user, without ever handling credentials.

This is throwaway verification, not committed E2E coverage. Use it to answer a
reviewer or unblock a merge. For lasting coverage use `generating-e2e-tests`.

## What it does

- Reuses the repo's `setup-free` / `setup-premium` Playwright projects to mint a
  signed-in session, so no username or password goes into the transcript.
- Turns on dark feature flags by clicking the toggles on `/feature` and saves a
  separate auth state for each flag combination (`scripts/save-flagged-auth.mjs`).
- Captures the requests a page actually sends, including SSR and client refetches.
- Mocks missing prerequisites (subscription, consent, etc.) for visual checks, with
  `MOCKED` cases reported separately from live ones.
- Checks whether the backend really honors a new query param by comparing result
  totals across values.
- Reports a verdict first, then a table of observed values, then anything
  unexpected it found.

## Requirements

- A local cx-web checkout with `e2e/config/<env>-configs/.env.secrets` in place.
  Get it from a teammate or 1Password; the skill never reads it.
- `npx playwright install chromium` run once from `e2e/`.

## Install

```bash
./install.sh verifying-cx-web-in-browser
```

## Example prompts

- "Verify PR 7627 in the branch environment as a premium user"
- "What params does /videos/alphabetical send with Language Presentation on?"
- "Does the backend actually filter on the new `audio` param?"
