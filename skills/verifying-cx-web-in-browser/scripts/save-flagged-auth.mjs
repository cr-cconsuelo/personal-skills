/**
 * Save a logged-in cx-web browser state with one or more dark feature flags enabled.
 *
 * Copy into the repo's e2e/ directory (that's where @playwright/test resolves from),
 * run it, then delete it. Nothing here is meant to be committed.
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   TEST_ENV=stage BASE_URL=<env> npx playwright test --project=setup-premium
 *
 * Usage:
 *   node save-flagged-auth.mjs \
 *     --base=https://cx-web-pr-7627.branch.stage.crunchyroll.com \
 *     --state=.auth/premium.json \
 *     --out=.auth/premium-lp.json \
 *     --flag="Language Presentation"
 *
 * --flag takes the label shown on /feature, not the flag key. Repeat it for several flags.
 */
import {chromium} from '@playwright/test';

const args = process.argv.slice(2);
const arg = name => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const flags = args.filter(a => a.startsWith('--flag=')).map(a => a.slice(7));

const base = arg('base');
const state = arg('state') ?? '.auth/premium.json';
const out = arg('out');

if (!base || !out || !flags.length) {
  console.error('need --base, --out and at least one --flag');
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({storageState: state});
const page = await context.newPage();

await page.goto(`${base}/feature`, {waitUntil: 'domcontentloaded'});

for (const label of flags) {
  const toggle = page.getByRole('switch', {name: label});
  await toggle.waitFor({timeout: 30000});

  if ((await toggle.getAttribute('aria-checked')) === 'true') {
    console.log(`${label}: already on`);
    continue;
  }

  await toggle.click();
  await page.waitForTimeout(1000);
  console.log(`${label}: aria-checked=${await toggle.getAttribute('aria-checked')}`);
}

// The app writes a single efg_state cookie holding [[hash, value], ...].
// Its presence is the only proof the toggles actually persisted.
const cookie = (await context.cookies()).find(c => c.name === 'efg_state');
if (!cookie) {
  console.error('no efg_state cookie — the toggles did not persist');
  await browser.close();
  process.exit(1);
}

await context.storageState({path: out});
console.log(`saved ${out}`);

await browser.close();
