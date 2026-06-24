'use strict';

// Slack adapter — captures messages I authored via the Slack Web API
// (search.messages requires a user token with search:read). Requires token +
// userId. If absent, marks itself unavailable; the agent can then capture Slack
// context manually (paste a thread) via `journal add`.

const { shortDate } = require('../util');

async function searchMessages(token, query) {
  const url =
    'https://slack.com/api/search.messages?' +
    new URLSearchParams({ query, count: '100', sort: 'timestamp' }).toString();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slack API HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(`Slack API error: ${json.error}`);
  return (json.messages && json.messages.matches) || [];
}

async function pull({ config, since }) {
  const cfg = config.slack;
  if (!cfg.token) {
    return {
      source: 'slack',
      available: false,
      reason: 'slack token not configured (paste threads manually via `journal add`)',
      entries: [],
    };
  }

  // Slack search supports an after: filter (yesterday-inclusive granularity).
  const query = `from:me after:${shortDate(since)}`;
  let matches;
  try {
    matches = await searchMessages(cfg.token, query);
  } catch (e) {
    return { source: 'slack', available: false, reason: String(e.message || e), entries: [] };
  }

  const entries = matches.map((m) => {
    const tsSeconds = m.ts ? Math.floor(parseFloat(m.ts)) : null;
    const date = tsSeconds ? new Date(tsSeconds * 1000).toISOString() : undefined;
    const channel = (m.channel && (m.channel.name || m.channel.id)) || 'dm';
    const text = (m.text || '').replace(/\s+/g, ' ').slice(0, 280);
    return {
      source: 'slack',
      type: 'collaboration',
      date,
      title: `Slack in #${channel}`,
      body: text,
      refs: { url: m.permalink || '' },
      naturalKey: m.permalink || `${channel}@${m.ts}`,
      tags: ['slack', 'communication'],
    };
  });

  return { source: 'slack', available: true, reason: null, entries };
}

module.exports = { pull };
