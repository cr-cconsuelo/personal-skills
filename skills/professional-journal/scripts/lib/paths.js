'use strict';

const path = require('path');
const fs = require('fs');

// Skill root = two levels up from this file (scripts/lib -> scripts -> skill root).
const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(SKILL_ROOT, 'data');
const REPORTS_DIR = path.join(SKILL_ROOT, 'reports');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.jsonl');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const CONFIG_FILE = path.join(SKILL_ROOT, 'config.json');
const CONFIG_EXAMPLE_FILE = path.join(SKILL_ROOT, 'config.example.json');

function ensureDirs() {
  for (const dir of [DATA_DIR, REPORTS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  SKILL_ROOT,
  DATA_DIR,
  REPORTS_DIR,
  ENTRIES_FILE,
  STATE_FILE,
  CONFIG_FILE,
  CONFIG_EXAMPLE_FILE,
  ensureDirs,
};
