import os from 'node:os';
import path from 'node:path';

export const paths = {
  claudeProjects: path.join(os.homedir(), '.claude', 'projects'),
};
