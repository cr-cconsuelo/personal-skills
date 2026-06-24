# Contributing a skill

Thanks for adding to `personal-skills`! Each skill is a self-contained folder
under `skills/`.

## Structure

```
skills/<your-skill>/
  SKILL.md          # required: frontmatter (name, description, allowed-tools) + instructions
  README.md         # optional but encouraged: human-facing overview + install/use
  scripts/          # optional: helper scripts the skill calls
  config.example.json   # optional: template if the skill needs per-user secrets
  .gitignore        # if the skill writes local data/secrets, ignore them here
```

### SKILL.md frontmatter

```yaml
---
name: your-skill
description: >
  One paragraph describing what the skill does and the trigger phrases that
  should activate it.
allowed-tools: all   # or a narrower list, e.g. shell
---
```

## Rules

1. **Never commit secrets or personal data.** If your skill stores runtime data
   or reads tokens, put them under `data/`, `reports/`, or `config.json` (all
   already gitignored repo-wide) and ship a `config.example.json` instead.
2. **Degrade gracefully.** If an integration/credential is missing, skip it with a
   clear message — don't crash.
3. **Keep helper scripts dependency-free where practical** so installs are trivial.
4. Add your skill to the table in the repo `README.md`.

## Test locally

```bash
./install.sh --link your-skill   # symlink into ~/.copilot/skills for fast iteration
```

Restart Copilot CLI and try your trigger phrases.
