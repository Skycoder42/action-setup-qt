import * as core from '@actions/core';
import * as installer from './installer';
import * as path from 'path';

async function run() {
  try {
    await installer.getQt(core.getInput('version'), core.getInput('platform'), core.getInput('platform-packages'), core.getInput('global-packages'));

    const matchersPath = path.join(__dirname, '..', '.github');
    console.log(`##[add-matcher]${path.join(matchersPath, 'qt.json')}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
