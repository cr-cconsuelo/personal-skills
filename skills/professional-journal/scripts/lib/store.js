'use strict';

// JSONL-backed entry store with content-hash dedupe and per-source sync cursors.
// Dependency-free (Node built-ins only) so the skill is trivial to share.

const fs = require('fs');
const crypto = require('crypto');
const {
  ENTRIES_FILE,
  STATE_FILE,
  ensureDirs,
} = require('./paths');

const VALID_SOURCES = ['jira', 'github', 'slack', 'confluence', 'testrail', 'manual'];
const VALID_TYPES = [
  'feature',
  'bugfix',
  'review',
  'collaboration',
  'incident',
  'test',
  'decision',
  'note',
];

// Deterministic id: stable hash of source + a natural key (refs/title/date).
// Re-pulling the same item therefore produces the same id and is deduped.
function makeId(source, naturalKey) {
  return crypto
    .createHash('sha1')
    .update(`${source}::${naturalKey}`)
    .digest('hex')
    .slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEntry(raw) {
  const source = raw.source;
  if (!VALID_SOURCES.includes(source)) {
    throw new Error(`Invalid source "${source}". Valid: ${VALID_SOURCES.join(', ')}`);
  }
  const type = raw.type || 'note';
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type "${type}". Valid: ${VALID_TYPES.join(', ')}`);
  }
  const naturalKey =
    raw.naturalKey ||
    (raw.refs && (raw.refs.url || raw.refs.jira || raw.refs.pr)) ||
    `${raw.title || ''}|${raw.date || ''}`;

  return {
    id: raw.id || makeId(source, naturalKey),
    date: raw.date || nowIso(),
    source,
    type,
    title: (raw.title || '').trim(),
    body: (raw.body || '').trim(),
    refs: raw.refs || {},
    collaborators: dedupeArray(raw.collaborators || []),
    impact: (raw.impact || '').trim(),
    tags: dedupeArray(raw.tags || []),
    captured_at: raw.captured_at || nowIso(),
  };
}

function dedupeArray(arr) {
  return [...new Set(arr.filter(Boolean).map((s) => String(s).trim()))];
}

function readAll() {
  ensureDirs();
  if (!fs.existsSync(ENTRIES_FILE)) return [];
  const lines = fs.readFileSync(ENTRIES_FILE, 'utf8').split('\n');
  const entries = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch (_e) {
      // Skip malformed lines rather than crash the whole journal.
    }
  }
  return entries;
}

function existingIds() {
  return new Set(readAll().map((e) => e.id));
}

// Append entries, skipping any whose id already exists. Returns added/skipped counts.
function appendEntries(rawEntries) {
  ensureDirs();
  const seen = existingIds();
  let added = 0;
  let skipped = 0;
  const out = [];
  for (const raw of rawEntries) {
    const entry = normalizeEntry(raw);
    if (seen.has(entry.id)) {
      skipped += 1;
      continue;
    }
    seen.add(entry.id);
    out.push(JSON.stringify(entry));
    added += 1;
  }
  if (out.length) {
    fs.appendFileSync(ENTRIES_FILE, out.join('\n') + '\n');
  }
  return { added, skipped };
}

function appendEntry(raw) {
  return appendEntries([raw]);
}

function readState() {
  ensureDirs();
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_e) {
    return {};
  }
}

function writeState(state) {
  ensureDirs();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function getCursor(source) {
  const state = readState();
  return (state.cursors && state.cursors[source]) || null;
}

function setCursor(source, value) {
  const state = readState();
  state.cursors = state.cursors || {};
  state.cursors[source] = value;
  state.updated_at = nowIso();
  writeState(state);
}

// Filter entries by an inclusive date window (ISO strings) and optional sources.
function query({ since, until, sources, types } = {}) {
  let entries = readAll();
  if (since) entries = entries.filter((e) => e.date >= since);
  if (until) entries = entries.filter((e) => e.date <= until);
  if (sources && sources.length) {
    entries = entries.filter((e) => sources.includes(e.source));
  }
  if (types && types.length) {
    entries = entries.filter((e) => types.includes(e.type));
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

module.exports = {
  VALID_SOURCES,
  VALID_TYPES,
  makeId,
  nowIso,
  normalizeEntry,
  readAll,
  existingIds,
  appendEntries,
  appendEntry,
  readState,
  writeState,
  getCursor,
  setCursor,
  query,
};
