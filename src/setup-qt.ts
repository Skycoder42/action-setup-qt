import * as path from 'path';

import * as core from '@actions/core';

import { Installer } from './installer';

async function run() {
	try {
		const installer = new Installer(core.getInput('version'), core.getInput('platform'));
		await installer.getQt(core.getInput('packages'), core.getInput('cachedir'), core.getInput('install-args'));
	} catch (error) {
		console.log(error);
		core.error(error.message);
		core.setFailed(error.message);
	}
}

run();
