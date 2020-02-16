import * as path from 'path';

import * as core from '@actions/core';

import Installer from './installer';

async function run() {
	try {
		const installer = new Installer(core.getInput('version'), core.getInput('platform'));
		await installer.getQt(core.getInput('packages'), core.getInput('deep-sources'), core.getInput('flat-sources'), core.getInput('cachedir'));
	} catch (error) {
		core.error(error);
		core.setFailed(error.message);
	}
}

run();
