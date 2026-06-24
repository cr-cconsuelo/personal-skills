'use strict';

// Confluence adapter — captures pages I created or last-updated via the
// Confluence Cloud REST API. Requires baseUrl + email + apiToken. If absent,
// marks itself unavailable so the agent can fall back to Atlassian MCP tools.

const { shortDate } = require('../util');

function basicAuth(email, token) {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

async function cql(cfg, query) {
  const url =
    cfg.baseUrl.replace(/\/$/, '') +
    '/wiki/rest/api/content/search?' +
    new URLSearchParams({
      cql: query,
      limit: '100',
      expand: 'history,version,space',
    }).toString();

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuth(cfg.email, cfg.apiToken),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Confluence API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.results || [];
}

async function pull({ config, since }) {
  const cfg = config.confluence;
  if (!cfg.baseUrl || !cfg.email || !cfg.apiToken) {
    return {
      source: 'confluence',
      available: false,
      reason: 'confluence baseUrl/email/apiToken not configured (use Atlassian MCP instead)',
      entries: [],
    };
  }

  const sinceDate = shortDate(since);
  const query = `type = page AND contributor = currentUser() AND lastModified >= "${sinceDate}" ORDER BY lastModified DESC`;

  let pages;
  try {
    pages = await cql(cfg, query);
  } catch (e) {
    return { source: 'confluence', available: false, reason: String(e.message || e), entries: [] };
  }

  const base = cfg.baseUrl.replace(/\/$/, '');
  const entries = pages.map((page) => {
    const when =
      (page.version && page.version.when) ||
      (page.history && page.history.createdDate) ||
      undefined;
    const space = (page.space && page.space.name) || '';
    const webui = page._links && page._links.webui ? `${base}/wiki${page._links.webui}` : base;
    return {
      source: 'confluence',
      type: 'collaboration',
      date: when,
      title: `Doc: ${page.title || ''}`,
      body: space ? `Space: ${space}` : '',
      refs: { url: webui },
      naturalKey: `${page.id}@${when}`,
      tags: ['confluence', 'documentation'],
    };
  });

  return { source: 'confluence', available: true, reason: null, entries };
}

module.exports = { pull };
