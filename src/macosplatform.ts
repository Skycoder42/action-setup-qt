import * as core from '@actions/core';
import * as ex from '@actions/exec';

import { UnixPlatform } from './unixplatform';

export class MacosPlatform extends UnixPlatform
{
    public async runPreInstaller(_cacheHit: boolean): Promise<void> {
		await ex.exec("brew", ["install", "make"]);
	}

	public aqtArgs(): [string, string, string] {
		if (this.platform == "ios")
			return ["mac", "ios", this.platform];
		else
			return ["mac", "desktop", this.platform];
	}
	
    public async runPostInstaller(_cacheHit: boolean, _installDir: string): Promise<void> {
		await ex.exec("which", ["make"]);
	}

    public addExtraEnvVars(_basePath: string): void {
		core.addPath("/usr/local/opt/make/libexec/gnubin");
	} 
}