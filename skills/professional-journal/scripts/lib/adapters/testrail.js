'use strict';

// TestRail adapter — captures test runs/results I authored via the TestRail API.
// Requires baseUrl + email + apiKey. If absent, marks itself unavailable; the
// agent can fall back to the cx-web offline snapshot or manual `journal add`.

const { shortDate } = require('../util');

function basicAuth(email, key) {
  return 'Basic ' + Buffer.from(`${email}:${key}`).toString('base64');
}

async function apiGet(cfg, endpoint) {
  const base = cfg.baseUrl.replace(/\/$/, '');
  const url = `${base}/index.php?/api/v2/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: basicAuth(cfg.email, cfg.apiKey),
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`TestRail API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pull({ config, since }) {
  const cfg = config.testrail;
  if (!cfg.baseUrl || !cfg.email || !cfg.apiKey) {
    return {
      source: 'testrail',
      available: false,
      reason: 'testrail baseUrl/email/apiKey not configured (use offline snapshot or manual add)',
      entries: [],
    };
  }

  const projectId = config.testrail.projectId || process.env.TESTRAIL_PROJECT_ID;
  if (!projectId) {
    return {
      source: 'testrail',
      available: false,
      reason: 'testrail projectId not configured (set TESTRAIL_PROJECT_ID)',
      entries: [],
    };
  }

  const createdAfter = Math.floor(new Date(since).getTime() / 1000);
  let runs;
  try {
    const data = await apiGet(cfg, `get_runs/${projectId}&created_after=${createdAfter}`);
    runs = Array.isArray(data) ? data : data.runs || [];
  } catch (e) {
    return { source: 'testrail', available: false, reason: String(e.message || e), entries: [] };
  }

  const entries = runs.map((run) => {
    const date = run.created_on ? new Date(run.created_on * 1000).toISOString() : undefined;
    const passed = run.passed_count || 0;
    const failed = run.failed_count || 0;
    const total = (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.untested_count || 0) + (run.retest_count || 0);
    return {
      source: 'testrail',
      type: 'test',
      date,
      title: `Test run: ${run.name || `#${run.id}`}`,
      body: `${total} cases — ${passed} passed, ${failed} failed (${shortDate(date)})`,
      refs: { url: run.url || '' },
      naturalKey: run.url || `run-${run.id}`,
      tags: ['testrail', 'qa'],
    };
  });

  return { source: 'testrail', available: true, reason: null, entries };
}

module.exports = { pull };
