import * as path from 'path';
import * as glob from 'glob'

import * as core from '@actions/core';
import * as ex from '@actions/exec';

import { UnixPlatform } from './unixplatform';

export class MacosPlatform extends UnixPlatform
{
    public addExtraEnvVars(_basePath: string): void {
		core.addPath("/usr/local/opt/make/libexec/gnubin");
	} 

    public installerName(): string {
        return "qt-unified-mac-x64-online.dmg";
	}

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {
		await ex.exec("which", ["make"]);
		await ex.exec("make", ["--version"]);
		await ex.exec("brew", ["install", "make"]);
	}

    public async runInstaller(tool: string, args: string[], instDir: string): Promise<void> {
		await ex.exec("hdiutil",  ["attach", tool]);
		const options: any = {};
		options.env = {
			"QT_QPA_PLATFORM": "minimal",
			"HOME": path.join(instDir, "..", 'home')
		};
		const vPath: string = glob.sync("/Volumes/qt-unified-mac-x64-*-online/qt-unified-mac-x64-*-online.app/Contents/MacOS/qt-unified-mac-x64-*-online")[0];
		await ex.exec(vPath, args, options);
	} 
	
    public async runPostInstaller(): Promise<void> {
		await ex.exec("which", ["make"]);
		await ex.exec("make", ["--version"]);
	}
}