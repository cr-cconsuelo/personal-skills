'use strict';

const { bullet, header, groupBy, SOURCE_LABEL, collaborators } = require('./common');

// Retro: what went well, what to improve, action items — over a sprint window.
function render({ entries, since, until }) {
  const lines = [header('Sprint Retro', since, until)];

  const shipped = entries.filter((e) =>
    /merged|closed|done|resolved|passed|shipped|released/i.test(`${e.title} ${e.body}`)
  );
  const reviews = entries.filter((e) => e.type === 'review');
  const incidents = entries.filter((e) => e.type === 'incident' || /incident|outage|hotfix/i.test(e.title));

  lines.push('\n## What went well');
  const wins = [];
  if (shipped.length) wins.push(`- Shipped ${shipped.length} item(s)`);
  if (reviews.length) wins.push(`- Reviewed ${reviews.length} PR(s)`);
  const people = collaborators(entries);
  if (people.length) wins.push(`- Collaborated with ${people.join(', ')}`);
  lines.push(wins.length ? wins.join('\n') : '- _(add reflections)_');

  lines.push('\n## What could improve');
  lines.push(
    incidents.length
      ? incidents.map(bullet).join('\n')
      : '- _(add reflections — incidents/blockers/process)_'
  );

  lines.push('\n## Highlights by area');
  const bySource = groupBy(entries, (e) => e.source);
  for (const [source, items] of bySource) {
    lines.push(`\n### ${SOURCE_LABEL[source] || source}`);
    lines.push(items.slice(0, 10).map(bullet).join('\n'));
  }

  lines.push('\n## Action items');
  lines.push('- [ ] _(add follow-ups for next sprint)_');

  return lines.join('\n') + '\n';
}

module.exports = { render };
