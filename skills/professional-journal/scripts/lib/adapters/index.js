'use strict';

// Registry of capture adapters. Each exports `pull({ config, since })` returning
// `{ source, available, reason, entries }` and never throws.
module.exports = {
  github: require('./github'),
  jira: require('./jira'),
  confluence: require('./confluence'),
  slack: require('./slack'),
  testrail: require('./testrail'),
};
