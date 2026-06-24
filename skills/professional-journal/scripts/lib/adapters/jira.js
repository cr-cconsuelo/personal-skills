'use strict';

// Jira adapter — captures issues I worked on via the Jira Cloud REST API.
// Requires baseUrl + email + apiToken in config/env. If absent, marks
// itself unavailable so the agent can fall back to the Atlassian MCP tools.

const { shortDate } = require('../util');

function basicAuth(email, token) {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

async function searchJql(cfg, jql) {
  const url =
    cfg.baseUrl.replace(/\/$/, '') +
    '/rest/api/3/search?' +
    new URLSearchParams({
      jql,
      maxResults: '100',
      fields: 'summary,status,updated,issuetype,assignee,project',
    }).toString();

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuth(cfg.email, cfg.apiToken),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Jira API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.issues || [];
}

async function pull({ config, since }) {
  const cfg = config.jira;
  if (!cfg.baseUrl || !cfg.email || !cfg.apiToken) {
    return {
      source: 'jira',
      available: false,
      reason: 'jira baseUrl/email/apiToken not configured (use Atlassian MCP instead)',
      entries: [],
    };
  }

  const sinceDate = shortDate(since);
  const jql = `assignee = currentUser() AND updated >= "${sinceDate}" ORDER BY updated DESC`;

  let issues;
  try {
    issues = await searchJql(cfg, jql);
  } catch (e) {
    return { source: 'jira', available: false, reason: String(e.message || e), entries: [] };
  }

  const entries = issues.map((issue) => {
    const f = issue.fields || {};
    const statusName = f.status && f.status.name ? f.status.name : 'unknown';
    const issueType = (f.issuetype && f.issuetype.name) || 'Task';
    const type = /bug/i.test(issueType) ? 'bugfix' : 'feature';
    return {
      source: 'jira',
      type,
      date: f.updated,
      title: `${issue.key}: ${f.summary || ''}`,
      body: `${issueType} — status: ${statusName}`,
      refs: { jira: issue.key, url: `${cfg.baseUrl.replace(/\/$/, '')}/browse/${issue.key}` },
      naturalKey: `${issue.key}@${f.updated}`,
      tags: ['jira', statusName.toLowerCase().replace(/\s+/g, '-')],
    };
  });

  return { source: 'jira', available: true, reason: null, entries };
}

module.exports = { pull };
