import * as fs from 'fs';
import * as os from 'os';
import * as core from '@actions/core';

async function run(): Promise<void> {
  const inputs = {
    cluster: core.getInput('cluster')
  }

  try {
    if (os.platform() !== 'linux') {
      throw new Error(`Only supported on linux platform`);
    }

    core.info(`📣 Cluster: ${inputs.cluster}`);
    core.info('🛒 Doing stuff...');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function cleanup(): Promise<void> {
}

run();
