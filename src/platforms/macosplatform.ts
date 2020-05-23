import { addPath } from '@actions/core';
import { exec } from '@actions/exec';

import UnixPlatform from './unixplatform';

export default class MacosPlatform extends UnixPlatform {
	public addExtraEnvVars(basePath: string): void {
		super.addExtraEnvVars(basePath);
		addPath("/usr/local/opt/make/libexec/gnubin");
	}

	public async runPreInstall(): Promise<void> {
		await super.runPreInstall();
		await exec("brew", ["update"]);
		await exec("brew", ["install", "make", "p7zip"]);
	}
}