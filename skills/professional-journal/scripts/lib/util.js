'use strict';

const { execFileSync } = require('child_process');

// Run a command, returning { ok, stdout, stderr }. Never throws.
function run(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      ...opts,
    });
    return { ok: true, stdout, stderr: '' };
  } catch (e) {
    return {
      ok: false,
      stdout: e.stdout ? String(e.stdout) : '',
      stderr: e.stderr ? String(e.stderr) : String(e.message || e),
    };
  }
}

function commandExists(cmd) {
  const probe = run(process.platform === 'win32' ? 'where' : 'which', [cmd]);
  return probe.ok && probe.stdout.trim().length > 0;
}

// Compute an ISO date N days ago (UTC), start of day.
function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function shortDate(iso) {
  return (iso || '').slice(0, 10);
}

module.exports = { run, commandExists, isoDaysAgo, shortDate };
