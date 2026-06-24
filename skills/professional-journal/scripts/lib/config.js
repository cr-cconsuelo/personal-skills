'use strict';

const fs = require('fs');
const { CONFIG_FILE } = require('./paths');

// Loads config.json if present, overlaying environment variables.
// Every value is optional — adapters degrade gracefully when creds are absent.
function loadConfig() {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (_e) {
      fileConfig = {};
    }
  }

  const env = process.env;
  return {
    identity: {
      // Used to attribute "my" activity across sources.
      githubLogin: env.JOURNAL_GITHUB_LOGIN || fileConfig?.identity?.githubLogin || null,
      jiraAccountId: env.JOURNAL_JIRA_ACCOUNT_ID || fileConfig?.identity?.jiraAccountId || null,
      email: env.JOURNAL_EMAIL || fileConfig?.identity?.email || null,
      displayName: env.JOURNAL_DISPLAY_NAME || fileConfig?.identity?.displayName || null,
    },
    github: {
      // GitHub uses the gh CLI auth by default; token optional.
      token: env.GITHUB_TOKEN || fileConfig?.github?.token || null,
    },
    jira: {
      baseUrl: env.JIRA_BASE_URL || fileConfig?.jira?.baseUrl || null,
      email: env.JIRA_EMAIL || fileConfig?.jira?.email || null,
      apiToken: env.JIRA_API_TOKEN || fileConfig?.jira?.apiToken || null,
    },
    confluence: {
      baseUrl: env.CONFLUENCE_BASE_URL || fileConfig?.confluence?.baseUrl || null,
      email: env.CONFLUENCE_EMAIL || fileConfig?.confluence?.email || null,
      apiToken: env.CONFLUENCE_API_TOKEN || fileConfig?.confluence?.apiToken || null,
    },
    slack: {
      token: env.SLACK_TOKEN || fileConfig?.slack?.token || null,
      userId: env.SLACK_USER_ID || fileConfig?.slack?.userId || null,
    },
    testrail: {
      baseUrl: env.TESTRAIL_BASE_URL || fileConfig?.testrail?.baseUrl || null,
      email: env.TESTRAIL_EMAIL || fileConfig?.testrail?.email || null,
      apiKey: env.TESTRAIL_API_KEY || fileConfig?.testrail?.apiKey || null,
    },
  };
}

module.exports = { loadConfig };
