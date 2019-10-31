import * as core from '@actions/core';
import * as installer from './installer';
import * as path from 'path';

async function run() {
  try {
    console.log(core.getInput('version'));
    console.log(core.getInput('platform'));
    console.log(core.getInput('platform-packages'));
    console.log(core.getInput('global-packages'));
    await installer.getQt(core.getInput('version'), core.getInput('platform'), core.getInput('platform-packages'), core.getInput('global-packages'));

    const matchersPath = path.join(__dirname, '..', '.github');
    console.log(`##[add-matcher]${path.join(matchersPath, 'qt.json')}`);
  } catch (error) {
    console.log(error);
	core.error(error.message);
    core.setFailed(error.message);
  }
}

run();
