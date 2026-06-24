'use strict';

const { bullet, header, collaborators } = require('./common');

// Standup: what I did recently (typically yesterday), what's in progress, blockers.
// `entries` are already filtered to the window and sorted newest-first.
function render({ entries, since, until }) {
  const done = entries.filter((e) =>
    /merged|closed|done|resolved|passed|fixed/i.test(`${e.title} ${e.body}`)
  );
  const inProgress = entries.filter((e) => !done.includes(e));

  const lines = [header('Standup', since, until)];

  lines.push('\n## Done');
  lines.push(done.length ? done.map(bullet).join('\n') : '- _(nothing logged)_');

  lines.push('\n## In progress');
  lines.push(inProgress.length ? inProgress.map(bullet).join('\n') : '- _(nothing logged)_');

  lines.push('\n## Blockers');
  const blockers = entries.filter((e) => /block|stuck|wait|blocked/i.test(`${e.title} ${e.body}`));
  lines.push(blockers.length ? blockers.map(bullet).join('\n') : '- None');

  const people = collaborators(entries);
  if (people.length) {
    lines.push(`\n## Collaborated with\n- ${people.join(', ')}`);
  }

  return lines.join('\n') + '\n';
}

module.exports = { render };
