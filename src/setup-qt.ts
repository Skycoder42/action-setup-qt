import * as path from 'path';

import * as core from '@actions/core';

import { Installer } from './installer';

async function run() {
	try {
		const installer = new Installer(core.getInput('version'), core.getInput('platform'));
		await installer.getQt(core.getInput('packages'), core.getInput('install-args'));

		const matchersPath = path.join(__dirname, '..', '.github');
		console.log(`##[add-matcher]${path.join(matchersPath, 'qt.json')}`);
	} catch (error) {
		console.log(error);
		core.error(error.message);
		core.setFailed(error.message);
	}
}

run();
