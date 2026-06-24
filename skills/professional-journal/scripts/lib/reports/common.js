'use strict';

// Shared helpers for templated (deterministic) report rendering. These are the
// fallback path; the SKILL.md instructs the Copilot agent to optionally rewrite
// these into a more polished narrative when AI synthesis is available.

const { shortDate } = require('../util');

function groupBy(entries, keyFn) {
  const map = new Map();
  for (const e of entries) {
    const k = keyFn(e);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(e);
  }
  return map;
}

function bullet(entry) {
  const ref =
    (entry.refs && (entry.refs.jira || entry.refs.pr)) ||
    (entry.refs && entry.refs.url ? entry.refs.url : '');
  const refStr = ref ? ` _(${ref})_` : '';
  return `- ${entry.title}${refStr}`;
}

function collaborators(entries) {
  const set = new Set();
  for (const e of entries) for (const c of e.collaborators || []) set.add(c);
  return [...set];
}

function header(title, since, until) {
  const range = `${shortDate(since)} → ${shortDate(until)}`;
  return `# ${title}\n\n_Period: ${range}_\n`;
}

const SOURCE_LABEL = {
  github: 'GitHub',
  jira: 'Jira',
  confluence: 'Confluence',
  slack: 'Slack',
  testrail: 'TestRail',
  manual: 'Notes',
};

module.exports = { groupBy, bullet, collaborators, header, SOURCE_LABEL };
