---
name: professional-journal
description: >
  Records a professional journal of the work you do at the company — features,
  bug fixes, code reviews, collaborations, decisions, incidents, testing — by
  capturing activity from Jira, GitHub, Slack, Confluence and TestRail (whenever
  permissions/API keys allow) plus manual notes, into a local JSONL store. Then
  generates Markdown reports for standups, sprint retros, sprint planning,
  performance evaluations and promotion cases. Use when the user asks to log/record
  what they did, capture their work, "pull my activity", write a standup, prep a
  retro, build a performance-review or promotion case. Triggered by phrases like
  "log my work", "record what I did", "update my journal", "pull my activity",
  "write my standup", "prep my retro", "build my promotion case", "performance
  review summary".
allowed-tools: all
---

# Professional Journal Skill

Maintains a private, local professional journal and turns it into shareable
summaries. The data store and all reports live **inside this skill's own folder**
and are gitignored — they are never shared, even though the skill itself is.

All journal operations go through one CLI:

```bash
bash <skill-dir>/scripts/journal.sh <command> [options]
```

`<skill-dir>` is the directory containing this `SKILL.md`.

---

## Data model

Each entry is one JSONL line in `data/entries.jsonl`:

| field | meaning |
|---|---|
| `id` | stable hash (dedupe key) |
| `date` | when the work happened (ISO-8601) |
| `source` | `jira` \| `github` \| `slack` \| `confluence` \| `testrail` \| `manual` |
| `type` | `feature` \| `bugfix` \| `review` \| `collaboration` \| `incident` \| `test` \| `decision` \| `note` |
| `title` | short summary |
| `body` | details / what + why |
| `refs` | `{ jira, pr, url }` evidence links |
| `collaborators` | people involved (`@name`) |
| `impact` | outcome / why it mattered |
| `tags` | themes (e.g. `auth`, `perf`) |

`data/state.json` holds per-source sync cursors so re-pulling never double-logs.

---

## Modes

### 1. Capture — automated pull

Pull recent activity from all available sources (each is skipped with a clear note
if its credentials/permissions are missing — never blocks the others):

```bash
bash <skill-dir>/scripts/journal.sh pull --days 7
# or a single source:
bash <skill-dir>/scripts/journal.sh pull --source github --days 14
```

- **GitHub** uses the existing `gh` CLI auth (no token needed).
- **Jira / Confluence / Slack / TestRail** use API keys from `config.json` (copy
  from `config.example.json`) or the matching env vars.

**When an API key is NOT configured for Jira, Confluence, Slack or TestRail**, the
script reports that source as skipped. In that case **you (the agent) should
capture it via the available MCP tools** and feed the results in:

1. Use the **Atlassian MCP** to fetch the user's recent Jira issues / Confluence
   pages, or the **Slack/TestRail** tools/snapshot if available.
2. Normalize each item to the entry schema above (set a stable `naturalKey`, e.g.
   the issue key + updated timestamp or the page/permalink URL, so re-imports dedupe).
3. Import them:

```bash
echo '<json-array-of-entries>' | bash <skill-dir>/scripts/journal.sh import
# or: bash <skill-dir>/scripts/journal.sh import --file entries.json
```

### 2. Capture — manual note / reflection

For things no integration can see (decisions, mentoring, design discussions,
impact you want to record in your own words):

```bash
bash <skill-dir>/scripts/journal.sh add \
  --title "Drove the auth migration design review" \
  --type decision \
  --impact "Aligned 3 teams on the token approach; unblocked Q3 work" \
  --with "@alice,@bob" --tags "auth,leadership" --jira CRWEB-1234
```

Always offer to add an `--impact` note — it is what powers performance and
promotion reports.

### 3. Report

```bash
bash <skill-dir>/scripts/journal.sh report <type> [--days N] [--save]
```

`<type>` is one of:

| Report | Default window | Purpose |
|---|---|---|
| `standup` | 2 days | Done / in-progress / blockers |
| `retro` | 14 days | Went well / improve / action items |
| `planning` | 14 days | In-flight + proposed next |
| `performance` | 180 days | Themed accomplishments + impact |
| `promotion` | 365 days | Scope / impact / leadership / collaboration |

`--save` writes to `reports/<type>-<date>.md`; otherwise it prints to stdout.

#### AI synthesis (preferred)

The CLI emits a **deterministic templated** report. After generating it, **you
should rewrite it into a polished narrative** using the raw entries as evidence:

- Keep every factual claim grounded in real entries; cite `refs` (Jira keys, PR
  links) as evidence. Never invent work that isn't in the journal.
- For `performance` / `promotion`, group by theme and lead with impact and scope.
- For `standup`, be terse: yesterday / today / blockers.
- Preserve the templated version's links; improve the prose, not the facts.

If AI synthesis isn't available, the templated report is a complete, usable fallback.

---

## Other commands

```bash
bash <skill-dir>/scripts/journal.sh list   [--days 30] [--source jira] [--limit 20]
bash <skill-dir>/scripts/journal.sh search "auth"
bash <skill-dir>/scripts/journal.sh status   # entry count, sync cursors, identity
```

---

## Typical workflow

1. `pull --days 7` to capture integrations; fill gaps with MCP `import` for any
   skipped source.
2. `add` any manual reflections / impact the tools can't see.
3. `report standup` (or retro/planning/performance/promotion), then AI-polish it.

## Privacy & sharing

- This skill is shared via the public `personal-skills` repo, but **journal data
  is not**: `data/`, `reports/`, and `config.json` are gitignored.
- Each teammate installs their own copy and gets a fully private journal.
- Never paste tokens or raw journal contents into commits or shared channels.
