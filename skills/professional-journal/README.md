# professional-journal

A Copilot CLI skill that records a **private professional journal** of your work
and turns it into ready-to-use summaries for **standups, sprint retros, planning,
performance reviews, and promotion cases**.

It captures activity from **Jira, GitHub, Slack, Confluence, and TestRail**
(whenever you have permission / API keys), plus your own manual notes, into a
local JSONL store — then generates Markdown reports.

## Why

Standups, retros, perf reviews, and promo packets all need the same thing: an
accurate record of what you did and why it mattered. This keeps that record for
you automatically, so you never have to reconstruct six months of work from memory.

## Install

This skill is distributed via the [`personal-skills`](../../README.md) repo. From
the repo root:

```bash
./install.sh professional-journal
```

That copies the skill into `~/.copilot/skills/professional-journal`. Restart
Copilot CLI so it picks up the new skill.

## Configure

GitHub works out of the box via your existing `gh` CLI auth. For the other
sources, copy the config template and fill in API keys (all optional):

```bash
cp config.example.json config.json
# edit config.json — add Jira / Confluence / Slack / TestRail keys you have
```

Sources without credentials are simply skipped (the Copilot agent can fill those
gaps via MCP tools). `config.json` is gitignored.

## Use

Ask Copilot naturally — e.g. "pull my activity this week", "write my standup",
"build my promotion case" — or run the CLI directly:

```bash
# capture
bash scripts/journal.sh pull --days 7
bash scripts/journal.sh add --title "Led auth design review" --type decision \
  --impact "Aligned 3 teams" --tags leadership

# report
bash scripts/journal.sh report standup
bash scripts/journal.sh report promotion --save

# browse
bash scripts/journal.sh list --days 30
bash scripts/journal.sh search "auth"
bash scripts/journal.sh status
```

See [`SKILL.md`](./SKILL.md) for the full workflow, data model, and AI-synthesis
behavior.

## Privacy

Your journal is **yours and local**. `data/`, `reports/`, and `config.json` are
gitignored and never leave your machine — only the skill code is shared.
