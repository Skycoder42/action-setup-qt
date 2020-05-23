import {getInput, error, setFailed} from "@actions/core";

import Installer from "./installer";

async function run() {
	try {
		const installer = new Installer(getInput('version'), getInput('platform'));
		await installer.getQt(getInput('packages'), 
			getInput('deep-sources'), 
			getInput('flat-sources'), 
			getInput('clean'));
	} catch (e) {
		console.error(e);
		error(e.message);
		setFailed(e.message);
	}
}

run();
