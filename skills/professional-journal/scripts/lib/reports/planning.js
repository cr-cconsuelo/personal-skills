'use strict';

const { bullet, header } = require('./common');

// Planning: what's in flight and candidate next work, derived from recent entries.
function render({ entries, since, until }) {
  const lines = [header('Sprint Planning', since, until)];

  const inFlight = entries.filter(
    (e) => !/merged|closed|done|resolved|passed|shipped/i.test(`${e.title} ${e.body}`)
  );

  lines.push('\n## In flight (carry-over candidates)');
  lines.push(inFlight.length ? inFlight.map(bullet).join('\n') : '- _(nothing in flight)_');

  lines.push('\n## Recently completed (context)');
  const done = entries.filter((e) => !inFlight.includes(e));
  lines.push(done.length ? done.slice(0, 10).map(bullet).join('\n') : '- _(none)_');

  lines.push('\n## Proposed next');
  lines.push('- [ ] _(add planned items for the upcoming sprint)_');

  return lines.join('\n') + '\n';
}

module.exports = { render };
