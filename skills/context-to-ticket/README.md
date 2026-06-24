# context-to-ticket

Turn an unstructured conversation — a Slack thread, a discussion summary, meeting
notes, or a quick manual description — into a single, clean Jira ticket
(Bug / Task / Story) using a consistent team format.

## What it does

1. **Ingests context** and distills the *final, authoritative* decision (not the
   first guess in a thread).
2. **Scopes against your codebase** (`grep`/`glob`) so the Technical Approach
   points at real files for Bugs/Tasks.
3. **Drafts the ticket** — Synopsis, Technical Approach, API Changes, How to
   Reproduce, Out of Scope, and testable Acceptance Criteria.
4. **Confirms with you** before writing anything to Jira.
5. **Creates and verifies** the issue (parent epic, assignee, story points).

## Setup

Copy the config template and fill in your Jira instance details:

```bash
cp config.example.json config.json
```

```json
{
  "jira": {
    "cloudId": "your-org.atlassian.net",
    "projectKey": "PROJ",
    "storyPointsField": "customfield_10016",
    "defaultParentEpic": "",
    "summaryStyle": "imperative verb, no ticket-key prefix",
    "descriptionFormat": "markdown"
  }
}
```

`config.json` is gitignored and stays local — your org-specific settings are never
shared. Anything missing from config is asked for before the ticket is created.

> **Story Points field:** the custom field id (`customfield_XXXXX`) varies per
> Jira instance. Find yours in your Jira field config and set `storyPointsField`.

## Use

Restart Copilot CLI after installing, then trigger it with phrases like:

- "make a ticket from this slack thread"
- "turn this thread into a jira ticket"
- "file a bug from this conversation"

## Requirements

- An Atlassian/Jira integration the agent can call (`createJiraIssue`,
  `editJiraIssue`, `getJiraIssue`, `atlassianUserInfo`).
- For best Technical Approach grounding, run it from inside the relevant repo.
