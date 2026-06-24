---
name: context-to-ticket
description: >
  Turns unstructured context — Slack threads, discussions, meeting notes, or
  manual input — into a single well-structured Jira ticket (Bug / Task / Story)
  using a consistent team format: synopsis, technical approach, out-of-scope,
  and acceptance criteria. Distills the decision/requirement from the
  conversation, scopes the change against the codebase, and creates the ticket
  with parent epic, assignee, and story points. Triggered by phrases like "make
  a ticket from this slack thread", "create a ticket from this discussion",
  "turn this thread into a jira ticket", "we had this thread, let's create a
  ticket", "file a bug from this conversation".
allowed-tools: all
---

# Context → Ticket Skill

Converts a Slack thread, discussion, meeting note, or manual description into a
single, clean Jira ticket using a consistent, team-agreed format.

This skill is for the **"here's a conversation, make a ticket"** workflow. If you
instead hand the agent an existing ticket key to flesh out, use an *enrich*
workflow rather than this one.

> **Configuration.** Jira-specific settings (cloud ID, project key, story-points
> field, default epic) live in a local `config.json` — copy `config.example.json`
> to `config.json` and fill it in. `config.json` is gitignored and never shared.
> Any value missing from config should be **asked for** before creating the
> ticket. Throughout this doc, `<projectKey>`, `<cloudId>`, and
> `<storyPointsField>` refer to those config values.

---

## Step 1 — Ingest the context

Accept any of these as the source of truth:

| Source | What to do |
|---|---|
| Pasted Slack thread | Read every message. Identify who said what and the **final** decision (later messages and Legal/PM/Eng-lead statements override earlier guesses). |
| Discussion summary | Use as the high-level intent; mine for constraints. |
| Meeting notes | Extract the agreed action item. |
| Manual input | Use directly. |

When distilling a thread:
- **Find the conclusion, not the brainstorm.** Threads often start with a wrong/partial answer that gets corrected. Capture the corrected, authoritative outcome.
- **Quote the authority.** If Legal/PM/a lead gave the binding guidance, reflect that in the Synopsis ("Per Legal guidance, …").
- **Separate the requirement from the implementation guess.** The thread may suggest an approach ("just swap the selector"); verify it before locking it into Technical Approach.

---

## Step 2 — Scope against the codebase (for Bug/Task)

Before drafting Technical Approach, do a quick grounding pass so the ticket points
at real files:

1. `grep`/`glob` for the feature named in the thread (component, selector, string, route).
2. Open the most relevant file(s) to confirm the current behaviour and the exact change.
3. Note the concrete file path(s) and the selector/function/flag involved.

Keep this lightweight — enough to make Technical Approach accurate, not a full implementation.

---

## Step 3 — Gather the ticket metadata

Collect (ask only for what's missing and can't be inferred):

| Field | Default / how to get it |
|---|---|
| Issue type | Infer: defect/regression → **Bug**; new small work → **Task**; user-facing feature → **Story**. Ask only if ambiguous. |
| Parent epic | Use `defaultParentEpic` from config if set; otherwise **ask**. |
| Assignee | Default to the **current user** (`atlassianUserInfo` → `account_id`). Honour "assign to me" / a named person. |
| Story points | Use the value the user gives; otherwise propose one and confirm. |
| Priority / labels | Only set if the user mentions them. |

---

## Step 4 — Draft the ticket (exact format)

Show this draft to the user **before** creating anything. Omit sections that don't apply.

```
## Synopsis

<2–3 sentences: the current behaviour, the required behaviour, and WHY
(cite the authority from the thread, e.g. "Per Legal guidance…").>

## Technical Approach

<Concrete file path(s) and the specific change. Reference the real
selector / function / flag / component confirmed in Step 2.>

## API Changes   ← omit if none

<New endpoints, params, or response fields. Use code blocks for shapes.>

## How to Reproduce   ← Bug only, omit otherwise

1. <step>
2. <step>
**Expected:** … **Actual:** …

## Out of Scope

- <Explicitly excluded item — often the thing the thread clarified is NOT part of this.>

## Acceptance Criteria

**AC1:** <observable, testable>
**AC2:** <observable, testable>
**AC3:** <empty/fallback/locale/country edge case as relevant>
```

### AC rules
- Observable behaviour, clear pass/fail, one sentence each.
- Cover happy path, the negative case, and the relevant edge (locale/country/empty/error).
- Group by feature-flag state when an FF is involved (`AC1 (FF enabled): …`).

---

## Step 5 — Confirm

Present the full draft plus the metadata header:

```
**Type:** <Bug/Task/Story> | **Parent:** <projectKey>-XXXX | **Story points:** <n> | **Assignee:** <name>
```

Ask: **"Does this look correct? Shall I create it in Jira?"**
Do **not** call any Jira write API until the user confirms.

---

## Step 6 — Create in Jira

`createJiraIssue`:
- `cloudId`: `<cloudId>` (from config)
- `projectKey`: `<projectKey>` (from config)
- `issueTypeName`: as agreed
- `summary`: short imperative title, no key prefix
- `description`: the Step 4 body
- `contentFormat`: `markdown`
- `assignee_account_id`: resolved account id
- `additional_fields`: `{ "parent": { "key": "<projectKey>-XXXX" }, "<storyPointsField>": <storyPoints> }`

> **Story Points custom field varies per Jira instance.** Use the
> `storyPointsField` value from config (commonly `customfield_10016`, but some
> instances differ). If story points come back `null` after create, set them with
> a follow-up `editJiraIssue` using that same field id.

Then verify with `getJiraIssue` (fields: `summary, assignee, <storyPointsField>, parent, issuetype`)
that parent, assignee, and story points all stuck.

---

## Step 7 — Report back

```
## Done ✅

**Ticket:** [<projectKey>-XXXX](https://<cloudId>/browse/<projectKey>-XXXX)
**Type:** <type> | **Parent:** <projectKey>-YYYY | **Assignee:** <name> | **Story Points:** <n>

<one-line summary of the change the ticket captures>
```

---

## Conventions

| Field | Value |
|---|---|
| Jira Cloud ID | `cloudId` from `config.json` |
| Project key | `projectKey` from `config.json` |
| Story Points field | `storyPointsField` from `config.json` |
| Summary style | Imperative verb, no ticket-key prefix |
| Description format | Markdown |
| Default assignee | Current user (`atlassianUserInfo`) |
| Hierarchy | Bug/Task/Story are level 0 and cannot parent each other; parent them to an Epic and use a "Relates" link if they must relate to a sibling. |

## Pitfalls

- Don't capture the first (often wrong) answer from a thread — capture the final, authoritative decision.
- Don't translate or over-scope: list clarified exclusions in **Out of Scope**.
- Always confirm the draft before writing to Jira.
- Verify story points after creation — the wrong custom field silently no-ops.
