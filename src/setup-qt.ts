import * as core from '@actions/core';
import * as installer from './installer';
import * as path from 'path';

async function run() {
  try {
    let version = core.getInput('version');
	let platforms = core.getInput('platforms');
	let pPackages = core.getInput('platform-packages');
	let gPackages = core.getInput('global-packages');
    if (version && platforms && pPackages && gPackages) {
      await installer.getQt(version, platforms, pPackages, gPackages);
    }

    const matchersPath = path.join(__dirname, '..', '.github');
    console.log(`##[add-matcher]${path.join(matchersPath, 'qt.json')}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
