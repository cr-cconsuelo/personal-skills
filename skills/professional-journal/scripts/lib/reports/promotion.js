'use strict';

const { bullet, header, collaborators } = require('./common');

// Promotion case: scope / impact / leadership narrative mapped to evidence refs.
// Organized around common promotion competencies so entries become evidence.
function render({ entries, since, until }) {
  const lines = [header('Promotion Case', since, until)];

  const evidence = (predicate) => entries.filter(predicate);

  const scope = evidence((e) => e.type === 'feature' && (e.impact || /launch|migrat|architect|design|lead/i.test(`${e.title} ${e.body}`)));
  const leadership = evidence((e) => /lead|mentor|onboard|drove|owned|coordinat|propos|decision/i.test(`${e.title} ${e.body} ${e.impact}`) || e.type === 'decision');
  const quality = evidence((e) => e.type === 'review' || e.type === 'test' || /test|quality|reliab|incident/i.test(`${e.title} ${e.body}`));
  const collab = evidence((e) => (e.collaborators && e.collaborators.length) || e.type === 'collaboration');

  function section(title, items, hint) {
    lines.push(`\n## ${title}`);
    lines.push(items.length ? items.map(bullet).join('\n') : `- _(${hint})_`);
  }

  section('Scope & Complexity', scope, 'add high-scope features with impact notes');
  section('Impact', entries.filter((e) => e.impact), 'add impact statements to entries');
  section('Technical Leadership', leadership, 'capture decisions, mentoring, ownership');
  section('Quality & Reliability', quality, 'reviews, testing, incident response');
  section('Collaboration & Influence', collab, 'cross-team work, partnerships');

  const people = collaborators(entries);
  if (people.length) {
    lines.push(`\n## Endorsement candidates\nPeople I worked closely with: ${people.join(', ')}`);
  }

  lines.push('\n---\n_Tip: add `impact` notes to entries (`journal add --impact "..."`) to strengthen this case._');

  return lines.join('\n') + '\n';
}

module.exports = { render };
