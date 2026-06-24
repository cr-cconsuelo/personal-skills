'use strict';

const fs = require('fs');
const path = require('path');

const store = require('./lib/store');
const adapters = require('./lib/adapters');
const { loadConfig } = require('./lib/config');
const { isoDaysAgo, shortDate } = require('./lib/util');
const { REPORTS_DIR, ensureDirs } = require('./lib/paths');

const REPORTERS = {
  standup: require('./lib/reports/standup'),
  retro: require('./lib/reports/retro'),
  planning: require('./lib/reports/planning'),
  performance: require('./lib/reports/performance'),
  promotion: require('./lib/reports/promotion'),
};

// Default lookback windows (days) per report type.
const DEFAULT_WINDOW = {
  standup: 2,
  retro: 14,
  planning: 14,
  performance: 180,
  promotion: 365,
};

// ── arg parsing ────────────────────────────────────────────────
function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function splitList(val) {
  if (!val || val === true) return [];
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── commands ───────────────────────────────────────────────────
function cmdAdd(flags) {
  if (!flags.title) {
    console.error('Error: --title is required for `add`.');
    process.exit(1);
  }
  const result = store.appendEntry({
    source: flags.source || 'manual',
    type: flags.type || 'note',
    title: flags.title,
    body: flags.body || '',
    date: flags.date || store.nowIso(),
    impact: flags.impact || '',
    refs: buildRefs(flags),
    collaborators: splitList(flags.with),
    tags: splitList(flags.tags),
  });
  if (result.added) {
    console.log(`Added 1 entry.`);
  } else {
    console.log('Entry already exists (deduped), nothing added.');
  }
}

function buildRefs(flags) {
  const refs = {};
  if (flags.jira) refs.jira = flags.jira;
  if (flags.pr) refs.pr = flags.pr;
  if (flags.url) refs.url = flags.url;
  return refs;
}

// Import normalized entries from a JSON file or stdin. Used by the Copilot agent
// to feed results captured via MCP tools (Jira/Confluence/Slack/TestRail).
function cmdImport(flags) {
  let text;
  if (flags.file) {
    text = fs.readFileSync(flags.file, 'utf8');
  } else {
    text = fs.readFileSync(0, 'utf8');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error(`Error: invalid JSON input (${e.message}).`);
    process.exit(1);
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const result = store.appendEntries(list);
  console.log(`Imported: ${result.added} added, ${result.skipped} skipped (dedup).`);
}

async function cmdPull(flags) {
  const config = loadConfig();
  const requested = splitList(flags.source);
  const sources = requested.length ? requested : Object.keys(adapters);
  const days = flags.days ? parseInt(flags.days, 10) : 7;
  const since = flags.since || isoDaysAgo(days);

  let totalAdded = 0;
  for (const name of sources) {
    const adapter = adapters[name];
    if (!adapter) {
      console.log(`- ${name}: unknown source, skipping`);
      continue;
    }
    let res;
    try {
      res = await adapter.pull({ config, since });
    } catch (e) {
      res = { source: name, available: false, reason: String(e.message || e), entries: [] };
    }
    if (!res.available) {
      console.log(`- ${name}: skipped (${res.reason})`);
      continue;
    }
    const { added, skipped } = store.appendEntries(res.entries);
    store.setCursor(name, store.nowIso());
    totalAdded += added;
    console.log(`- ${name}: ${res.entries.length} found, ${added} added, ${skipped} deduped`);
  }
  console.log(`\nPull complete — ${totalAdded} new entr${totalAdded === 1 ? 'y' : 'ies'} since ${shortDate(since)}.`);
}

function cmdReport(flags, positional) {
  const type = positional[0] || flags.type;
  if (!type || !REPORTERS[type]) {
    console.error(`Error: report type must be one of: ${Object.keys(REPORTERS).join(', ')}.`);
    process.exit(1);
  }
  const days = flags.days ? parseInt(flags.days, 10) : DEFAULT_WINDOW[type];
  const since = flags.since || isoDaysAgo(days);
  const until = flags.until || store.nowIso();
  const sources = splitList(flags.source);

  const entries = store.query({ since, until, sources });
  const markdown = REPORTERS[type].render({ entries, since, until });

  if (flags.out || flags.save) {
    ensureDirs();
    const file =
      typeof flags.out === 'string'
        ? flags.out
        : path.join(REPORTS_DIR, `${type}-${shortDate(until)}.md`);
    fs.writeFileSync(file, markdown);
    console.log(`Report written to ${file}`);
  } else {
    process.stdout.write(markdown);
  }
}

function cmdList(flags) {
  const days = flags.days ? parseInt(flags.days, 10) : 30;
  const since = flags.since || isoDaysAgo(days);
  const sources = splitList(flags.source);
  const entries = store.query({ since, sources });
  const limit = flags.limit ? parseInt(flags.limit, 10) : entries.length;
  for (const e of entries.slice(0, limit)) {
    console.log(`${shortDate(e.date)}  [${e.source}/${e.type}]  ${e.title}`);
  }
  console.log(`\n${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} since ${shortDate(since)}.`);
}

function cmdSearch(flags, positional) {
  const term = (positional[0] || flags.q || '').toLowerCase();
  if (!term) {
    console.error('Error: provide a search term, e.g. `search "auth"`.');
    process.exit(1);
  }
  const entries = store.readAll().filter((e) => {
    const hay = `${e.title} ${e.body} ${e.impact} ${(e.tags || []).join(' ')} ${(e.collaborators || []).join(' ')}`.toLowerCase();
    return hay.includes(term);
  });
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const e of entries) {
    console.log(`${shortDate(e.date)}  [${e.source}/${e.type}]  ${e.title}`);
  }
  console.log(`\n${entries.length} match(es) for "${term}".`);
}

function cmdStatus() {
  const config = loadConfig();
  const all = store.readAll();
  console.log(`Journal entries: ${all.length}`);
  const state = store.readState();
  console.log('\nSource availability & last sync:');
  for (const name of Object.keys(adapters)) {
    const cursor = state.cursors && state.cursors[name] ? shortDate(state.cursors[name]) : 'never';
    console.log(`- ${name}: last pulled ${cursor}`);
  }
  console.log('\nConfigured identity:');
  console.log(`- github login: ${config.identity.githubLogin || '(gh CLI default)'}`);
}

function usage() {
  console.log(`Professional Journal CLI

Usage: node journal.js <command> [options]

Commands:
  add        Add a manual entry
             --title <t> [--body <b>] [--type <t>] [--source <s>]
             [--impact <i>] [--with a,b] [--tags x,y] [--jira KEY] [--pr repo#n] [--url <u>]
  import     Import normalized entries as JSON (--file <f> or stdin)
  pull       Pull activity from sources [--source jira,github,...] [--days N] [--since ISO]
  report     Generate a report: standup|retro|planning|performance|promotion
             [--days N] [--since ISO] [--until ISO] [--source ...] [--save | --out <file>]
  list       List recent entries [--days N] [--source ...] [--limit N]
  search     Full-text search entries: search "<term>"
  status     Show entry counts, sync cursors, and identity

Entry types: feature, bugfix, review, collaboration, incident, test, decision, note
Sources:     jira, github, slack, confluence, testrail, manual
`);
}

// ── dispatch ───────────────────────────────────────────────────
async function main() {
  const [, , command, ...rest] = process.argv;
  const { flags, positional } = parseFlags(rest);

  switch (command) {
    case 'add':
      return cmdAdd(flags);
    case 'import':
      return cmdImport(flags);
    case 'pull':
      return cmdPull(flags);
    case 'report':
      return cmdReport(flags, positional);
    case 'list':
      return cmdList(flags);
    case 'search':
      return cmdSearch(flags, positional);
    case 'status':
      return cmdStatus();
    case 'help':
    case undefined:
      return usage();
    default:
      console.error(`Unknown command: ${command}\n`);
      usage();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message || e}`);
  process.exit(1);
});
