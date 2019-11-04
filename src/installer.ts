import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as ex from '@actions/exec';

import { IPlatform } from './platform';
import { LinuxPlatform, AndroidPlatform } from './linuxplatform';
import { WindowsPlatform, MingwPlatform, MsvcPlatform } from './windowsplatform';
import { MacosPlatform } from './macosplatform';

import * as qtScript from './qt-installer-script-base';

export class Installer
{
	private version: string;
	private platform: IPlatform;
	private tempDir: string;

	public constructor(version: string, platform: string) {
		this.tempDir = this.initTempDir(platform);
		this.version = version;
		switch (os.platform()) {
		case "linux":
			if (platform.includes("android"))
				this.platform = new AndroidPlatform(platform);
			else
				this.platform = new LinuxPlatform(platform);
			break;
		case "win32":
			if (platform.includes("mingw"))
				this.platform = new MingwPlatform(platform, version);
			else
				this.platform = new MsvcPlatform(platform, version);
			break;
		case "darwin":
			this.platform = new MacosPlatform(platform);
			break;
		default:
			throw `Install platform ${os.platform()} is not supported by this action`;
		}
	}

	public async getQt(packages: string, iArgs: string): Promise<void> {
		// install qdep
		const pythonPath: string = await io.which('python', true);
		await ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
		
		// check cache for Qt installation
		let toolPath: string | null = tc.find('qt', this.version, this.platform.platform);
	
		if (!toolPath) {
			// download, extract, cache
			toolPath = await this.acquireQt(packages, iArgs);
			core.debug('Qt installation is cached under ' + toolPath);
		}
	
		core.addPath(path.join(toolPath, "bin"));
		this.platform.addExtraEnvVars(toolPath);
		await ex.exec("qmake", ["-version"]);
	}

	private initTempDir(platform: string): string {
		let tempDirectory: string = process.env['RUNNER_TEMP'] || ''
		if (!tempDirectory) {
			let baseLocation: string
			if (platform == "win32") {
				// On windows use the USERPROFILE env variable
				baseLocation = process.env['USERPROFILE'] || 'C:\\'
			} else {
				if (platform === 'darwin')
					baseLocation = '/Users'
				else
					baseLocation = '/home'
			}
			tempDirectory = path.join(baseLocation, 'actions', 'temp')
		}
		return tempDirectory;
	}

	private async acquireQt(packages: string, iArgs: string): Promise<string> {
		// download the installer
		const downloadPath: string = await tc.downloadTool(`https://download.qt.io/official_releases/online_installers/${this.platform.installerName()}`);
	
		// create the script and run the installer
		const installPath: string = path.join(this.tempDir, 'qt');
		const scriptPath: string = path.join(this.tempDir, 'qt-installer-script.qs');
		await fs.mkdir(path.join(this.tempDir, 'home'));
		await fs.writeFile(scriptPath, this.generateScript(installPath, packages));
		await this.platform.runInstaller(downloadPath, ["--script", scriptPath].concat(iArgs.split(" ")), installPath);
		
		// add qdep prf file
		const qmakePath: string = path.join(installPath, this.version, this.platform.platform, "bin", this.platform.qmakeName());
		const qdepPath: string = await io.which('qdep', true)
		await ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
	
		// install into the local tool cache
		return await tc.cacheDir(path.join(installPath, this.version, this.platform.platform), 'qt', this.version, this.platform.platform);
	}

	private generateScript(path: string, packages: string): string {
		const qtVer: string = this.version.replace(/\./g, "")
		let modules = [`qt.qt5.${qtVer}.${this.platform.installPlatform()}`];
		for (let entry of packages.split(","))
			modules.push(`qt.qt5.${qtVer}.${entry}`);
		const extraPkgs = this.platform.extraPackages();
		if (extraPkgs)
			modules = modules.concat(extraPkgs);
		return qtScript.generateScript(path, modules);
	}
}