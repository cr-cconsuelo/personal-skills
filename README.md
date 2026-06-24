# personal-skills

A small, shareable home for my personal [GitHub Copilot CLI](https://github.com/github/copilot-cli)
skills. Clone it, install a skill into your own `~/.copilot/skills`, and you're set.

Teammates are welcome to use these and to add their own.

## Skills

| Skill | What it does |
|---|---|
| [`professional-journal`](./skills/professional-journal) | Records your work (Jira/GitHub/Slack/Confluence/TestRail + manual notes) into a private local journal and generates standup / retro / planning / performance-review / promotion-case reports. |
| [`context-to-ticket`](./skills/context-to-ticket) | Turns an unstructured conversation (Slack thread, discussion, meeting notes, or manual input) into a single well-structured Jira ticket — synopsis, technical approach, out-of-scope, and acceptance criteria — then creates and verifies it. |

## Install

```bash
git clone https://github.com/cr-cconsuelo/personal-skills.git
cd personal-skills

./install.sh                       # install every skill
./install.sh professional-journal  # install one skill
./install.sh --link professional-journal   # symlink for local development
```

Skills are installed into `~/.copilot/skills/<name>`. Restart Copilot CLI to pick
them up, then invoke them by describing what you want (the CLI matches the skill's
trigger phrases).

## Privacy

These skills are public, but **your data is not**. Each skill keeps its runtime
data (e.g. journal entries, generated reports) and per-user `config.json` locally,
and the repo `.gitignore` blocks `**/data/`, `**/reports/`, and `**/config.json`
from ever being committed.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add a skill.
