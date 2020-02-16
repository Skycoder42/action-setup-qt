import * as os from 'os';
import { promises as fs } from 'fs';
import * as fssync from 'fs';
import * as path from 'path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as ex from '@actions/exec';

import IPlatform from './platforms/platform';
import LinuxPlatform from './platforms/linuxplatform';
import AndroidPlatform from "./platforms/androidplatform";
import MingwPlatform from "./platforms/mingwplatform";
import MsvcPlatform from "./platforms/msvcplatform";
import MacosPlatform from './platforms/macosplatform';

import * as qtScript from './qt-installer-script-base';

export default class Installer
{
	private readonly _version: string;
	private readonly _platform: IPlatform;
	private readonly _tempDir: string;

	public constructor(version: string, platform: string) {
		this._tempDir = this.initTempDir(os.platform());
		this._version = version;
		switch (os.platform()) {
		case "linux":
			if (platform.includes("android"))
				this._platform = new AndroidPlatform(platform);
			else
				this._platform = new LinuxPlatform(platform);
			break;
		case "win32":
			if (platform.includes("mingw"))
				this._platform = new MingwPlatform(platform, version);
			else
				this._platform = new MsvcPlatform(platform, version);
			break;
		case "darwin":
			this._platform = new MacosPlatform(platform);
			break;
		default:
			throw `Install platform ${os.platform()} is not supported by this action`;
		}
	}

	public async getQt(packages: string, deepSrc: string, flatSrc: string, cachedir: string): Promise<void> {
		// install qdep
		const pythonPath: string = await io.which('python', true);
		core.debug(`Using python: ${pythonPath}`);
		await ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
		core.info("Installed qdep");
		
		// check caches for Qt installation
		let toolPath: string | null = null;
		if (cachedir) {
			if (fssync.existsSync(path.join(cachedir, "bin", this._platform.qmakeName()))) {
				toolPath = path.resolve(cachedir);
				core.debug('Using globally cached Qt: ' + toolPath);
			}
		} else
			toolPath = tc.find('qt', this._version, this._platform.platform);
	
		// download, extract, cache
		if (!toolPath) {
			await this._platform.runPreInstaller(false);
			core.debug('Downloading and installing Qt from online installer');
			toolPath = await this.acquireQt(packages, iArgs, cachedir);
		} else {
			await this._platform.runPreInstaller(true);
			core.debug('Using locally cached Qt: ' + toolPath);
		}
		core.info('Using Qt installation: ' + toolPath);

		// update output / env vars
		core.setOutput("qtdir", toolPath);
		core.addPath(path.join(toolPath, "bin"));
		this._platform.addExtraEnvVars(toolPath);

		// run post installer
		await this._platform.runPostInstaller();
	
		await ex.exec("qmake", ["-version"]);
		await ex.exec("qmake", ["-query"]);

		// set outputs
		core.setOutput("make", this._platform.makeName());
		core.setOutput("tests", String(this.shouldTest()));
		core.setOutput("testflags", this._platform.testFlags());

		// set install dir, create artifact symlink
		const iPath: [string, string] = this._platform.setupInstallDir(toolPath);
		await io.mkdirP(iPath[0]);
		const instPath = path.join(iPath[0], os.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), "..", "..");
		core.setOutput('installdir', iPath[1]);
		core.setOutput('outdir', instPath);
	}

	private initTempDir(platform: NodeJS.Platform): string {
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

	private async acquireQt(packages: string, iArgs: string, cachedir: string): Promise<string> {
		// download the installer
		const downloadPath: string = await tc.downloadTool(`http://download.qt.io/official_releases/online_installers/${this._platform.installerName()}`);
	
		// create the script and run the installer
		const installPath: string = path.join(this._tempDir, 'qt');
		const scriptPath: string = path.join(this._tempDir, 'qt-installer-script.qs');
		await fs.mkdir(path.join(this._tempDir, 'home'));
		await fs.writeFile(scriptPath, this.generateScript(installPath, packages));
		await this._platform.runInstaller(downloadPath, ["--script", scriptPath].concat(iArgs.split(" ")), installPath);
		core.info(`Installed Qt ${this._version} for ${this._platform.platform}`);
		
		// add qdep prf file
		const qmakePath: string = path.join(installPath, this._version, this._platform.platform, "bin", this._platform.qmakeName());
		const qdepPath: string = await io.which('qdep', true)
		await ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
		core.info("Successfully prepared qdep");
	
		// install into the local tool cache or global cache
		let resDir: string;
		if (cachedir) {
			await io.mv(path.join(installPath, this._version, this._platform.platform), cachedir);
			resDir = path.resolve(cachedir);
		} else
			resDir = await tc.cacheDir(path.join(installPath, this._version, this._platform.platform), 'qt', this._version, this._platform.platform);

		// remove tmp installation to free some space
		await io.rmRF(installPath);
		return resDir;
	}

	private generateScript(path: string, packages: string): string {
		const qtVer: string = this._version.replace(/\./g, "")
		let modules = [`qt.qt5.${qtVer}.${this._platform.installPlatform()}`];
		for (let entry of packages.split(","))
			modules.push(`qt.qt5.${qtVer}.${entry}`);
		const extraPkgs = this._platform.extraPackages();
		if (extraPkgs)
			modules = modules.concat(extraPkgs);
		return qtScript.generateScript(path, modules);
	}

	private shouldTest(): boolean {
		const platform = this._platform.platform;
		if (platform.includes("android") ||
			platform.includes("wasm") ||
			platform.includes("winrt") ||
			platform.includes("ios"))
			return false;
		else
			return true;
	}
}
