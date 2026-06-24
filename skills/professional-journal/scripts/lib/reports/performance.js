'use strict';

const { bullet, header, groupBy, collaborators } = require('./common');

// Performance evaluation: themed accomplishments with impact over a period.
// Groups by tag/theme and surfaces impact statements and collaboration breadth.
function render({ entries, since, until }) {
  const lines = [header('Performance Evaluation Summary', since, until)];

  const features = entries.filter((e) => e.type === 'feature');
  const fixes = entries.filter((e) => e.type === 'bugfix');
  const reviews = entries.filter((e) => e.type === 'review');
  const tests = entries.filter((e) => e.type === 'test');
  const docs = entries.filter((e) => e.type === 'collaboration');

  lines.push('\n## At a glance');
  lines.push(`- Features/initiatives: ${features.length}`);
  lines.push(`- Bug fixes: ${fixes.length}`);
  lines.push(`- Code reviews: ${reviews.length}`);
  lines.push(`- Testing/QA: ${tests.length}`);
  lines.push(`- Docs/collaboration: ${docs.length}`);
  const people = collaborators(entries);
  lines.push(`- Distinct collaborators: ${people.length}`);

  lines.push('\n## Accomplishments by theme');
  const byTag = new Map();
  for (const e of entries) {
    const theme = (e.tags && e.tags.find((t) => !['github', 'jira', 'slack', 'confluence', 'testrail', 'manual'].includes(t))) || 'general';
    if (!byTag.has(theme)) byTag.set(theme, []);
    byTag.get(theme).push(e);
  }
  for (const [theme, items] of [...byTag.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`\n### ${theme}`);
    lines.push(items.slice(0, 15).map(bullet).join('\n'));
  }

  lines.push('\n## Impact statements');
  const impacts = entries.filter((e) => e.impact);
  lines.push(
    impacts.length
      ? impacts.map((e) => `- ${e.impact} _(${e.refs.jira || e.refs.pr || e.refs.url || e.title})_`).join('\n')
      : '- _(add impact notes to entries to populate this section)_'
  );

  if (people.length) {
    lines.push(`\n## Collaboration\nWorked with: ${people.join(', ')}`);
  }

  return lines.join('\n') + '\n';
}

module.exports = { render };
