import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const paths = {
  claudeProjects: path.join(HOME, '.claude', 'projects'),
  configDir: path.join(HOME, '.claude-ace'),
  configFile: path.join(HOME, '.claude-ace', 'config.json'),
  stateFile: path.join(HOME, '.claude-ace', 'state.json'),
};

export function loadConfig() {
  const apiCallsEnabled = process.env.CLAUDE_ACE_API_CALLS_ENABLED !== '0';
  return {
    apiBaseUrl: process.env.CLAUDE_ACE_API_BASE_URL || 'https://gitjob.io',
    apiCallsEnabled,
    emailOverride: process.env.CLAUDE_ACE_EMAIL || '',
    batchSize: 500,
    bodyByteLimit: 1024 * 1024,
  };
}
