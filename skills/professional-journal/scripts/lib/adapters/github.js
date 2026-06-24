'use strict';

// GitHub adapter — captures my PRs, reviews, and issues via the `gh` CLI,
// reusing existing gh auth. Falls back to unavailable if gh is missing/unauthed.

const { run, commandExists, shortDate } = require('../util');

function ghAvailable() {
  if (!commandExists('gh')) {
    return { ok: false, reason: 'gh CLI not installed' };
  }
  const status = run('gh', ['auth', 'status']);
  if (!status.ok) {
    return { ok: false, reason: 'gh CLI not authenticated (run `gh auth login`)' };
  }
  return { ok: true };
}

function ghLogin(config) {
  if (config.identity.githubLogin) return config.identity.githubLogin;
  const res = run('gh', ['api', 'user', '--jq', '.login']);
  return res.ok ? res.stdout.trim() : null;
}

function searchPrs(login, since) {
  const args = [
    'search',
    'prs',
    '--author',
    login,
    '--updated',
    `>=${shortDate(since)}`,
    '--limit',
    '100',
    '--json',
    'title,url,repository,number,state,updatedAt,closedAt',
  ];
  const res = run('gh', args);
  if (!res.ok) return [];
  try {
    return JSON.parse(res.stdout);
  } catch (_e) {
    return [];
  }
}

function searchReviewedPrs(login, since) {
  const args = [
    'search',
    'prs',
    '--reviewed-by',
    login,
    '--updated',
    `>=${shortDate(since)}`,
    '--limit',
    '100',
    '--json',
    'title,url,repository,number,author,updatedAt',
  ];
  const res = run('gh', args);
  if (!res.ok) return [];
  try {
    return JSON.parse(res.stdout).filter((pr) => !pr.author || pr.author.login !== login);
  } catch (_e) {
    return [];
  }
}

function repoName(repository) {
  if (!repository) return '';
  return repository.nameWithOwner || repository.name || '';
}

function pull({ config, since }) {
  const avail = ghAvailable();
  if (!avail.ok) {
    return { source: 'github', available: false, reason: avail.reason, entries: [] };
  }
  const login = ghLogin(config);
  if (!login) {
    return { source: 'github', available: false, reason: 'could not resolve gh login', entries: [] };
  }

  const entries = [];

  for (const pr of searchPrs(login, since)) {
    const repo = repoName(pr.repository);
    const merged = pr.state === 'closed' && pr.closedAt;
    entries.push({
      source: 'github',
      type: 'feature',
      date: pr.updatedAt || pr.closedAt,
      title: `${merged ? 'Merged' : 'Worked on'} PR: ${pr.title}`,
      body: `${repo}#${pr.number} (${pr.state})`,
      refs: { pr: `${repo}#${pr.number}`, url: pr.url },
      naturalKey: pr.url,
      tags: ['github', 'pull-request'],
    });
  }

  for (const pr of searchReviewedPrs(login, since)) {
    const repo = repoName(pr.repository);
    const author = pr.author && pr.author.login ? `@${pr.author.login}` : null;
    entries.push({
      source: 'github',
      type: 'review',
      date: pr.updatedAt,
      title: `Reviewed PR: ${pr.title}`,
      body: `${repo}#${pr.number}`,
      refs: { pr: `${repo}#${pr.number}`, url: pr.url },
      collaborators: author ? [author] : [],
      naturalKey: `review::${pr.url}`,
      tags: ['github', 'code-review'],
    });
  }

  return { source: 'github', available: true, reason: null, entries };
}

module.exports = { pull };
