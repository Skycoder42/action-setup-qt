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

import Downloader from './downloader';
import VersionNumber from './versionnumber';
import { URL } from 'url';

export default class Installer
{
	private readonly _version: VersionNumber;
	private readonly _platform: IPlatform;
	private readonly _downloader: Downloader;
	private readonly _tempDir: string;

	public constructor(version: string, platform: string) {
		this._tempDir = this.initTempDir(os.platform());

		this._version = VersionNumber.fromString(version);
		switch (os.platform()) {
		case "linux":
			if (platform.includes("android"))
				this._platform = new AndroidPlatform(platform);
			else
				this._platform = new LinuxPlatform(platform);
			this._downloader = new Downloader("linux", "x64", this._version, this._platform.platform);
			break;
		case "win32":
			if (platform.includes("mingw"))
				this._platform = new MingwPlatform(platform, this._version);
			else
				this._platform = new MsvcPlatform(platform, this._version);
				this._downloader = new Downloader("windows", "x86", this._version, this._platform.platform);
			break;
		case "darwin":
			this._platform = new MacosPlatform(platform);
			this._downloader = new Downloader("mac", "x64", this._version, this._platform.platform);
			break;
		default:
			throw `Install platform ${os.platform()} is not supported by this action`;
		}
	}

	public async getQt(packages: string, deepSrc: string, flatSrc: string, cachedir: string, clean: boolean): Promise<void> {
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
			toolPath = tc.find('qt', this._version.toString(), this._platform.platform);
	
		// clean if required
		if (clean && toolPath) {
			await io.rmRF(toolPath);
			toolPath = null;
		}

		// download, extract, cache
		let cached: boolean;
		if (!toolPath) {
			cached = false;
			core.debug('Downloading and installing Qt');
			console.log(deepSrc, flatSrc);
			toolPath = await this.acquireQt(this.parseList(packages, ','),
				this.parseList(deepSrc, ' '),
				this.parseList(flatSrc, ' '),
				cachedir);
		} else {
			cached = true;
			core.debug('Using locally cached Qt: ' + toolPath);
		}
		core.info('Using Qt installation: ' + toolPath);

		// update output / env vars
		core.setOutput("qtdir", toolPath);
		core.addPath(path.join(toolPath, "bin"));
		this._platform.addExtraEnvVars(toolPath);

		// run post installer
		await this._platform.runPostInstall(cached, toolPath);
	
		// log stuff
		await ex.exec("qmake", ["-version"]);
		await ex.exec("qmake", ["-query"]);

		// set outputs
		core.setOutput("make", this._platform.makeName());
		core.setOutput("tests", String(this.shouldTest()));
		core.setOutput("testflags", this._platform.testFlags());

		// set install dir, create artifact symlink
		const iPath: [string, string] = this._platform.installDirs(toolPath);
		await io.mkdirP(iPath[0]);
		const instPath = path.join(iPath[0], os.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), "..", "..");
		core.setOutput('outdir', instPath);
		core.setOutput('installdir', iPath[1]);
	}

	private parseList(list: string, seperator: string): string[] {
		return list
			.split(seperator)
			.map(e => e.trim())
			.filter(e => e.length > 0);
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

	private async acquireQt(packages: string[], deepSrc: string[], flatSrc: string[], cachedir: string): Promise<string> {
		// download source definitions
		await this._downloader.addQtSource();
		for (const src of deepSrc)
			await this._downloader.addSource(new URL(src), true);
		for (const src of flatSrc)
			await this._downloader.addSource(new URL(src), false);

		// add packages
		core.debug(`Available modules: ${this._downloader.modules().join(", ")}`);
		for (const pkg of packages)
			this._downloader.addDownload(pkg, true);

		// download and install
		const installPath = path.join(this._tempDir, 'qt');
		await this._downloader.installTo(installPath);
		
		// add qdep prf file
		const vString = this._version.toString();
		const qmakePath = path.join(installPath, vString, this._platform.platform, "bin", this._platform.qmakeName());
		const qdepPath = await io.which('qdep', true)
		await ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
		core.info("Successfully prepared qdep");
	
		// install into the local tool cache or global cache
		let resDir: string;
		if (cachedir) {
			await io.mv(path.join(installPath, vString, this._platform.platform), cachedir);
			resDir = path.resolve(cachedir);
		} else
			resDir = await tc.cacheDir(path.join(installPath, vString, this._platform.platform), 'qt', vString, this._platform.platform);

		// move tools
		await io.mv(path.join(installPath, "Tools"), path.join(resDir, "Tools"));

		// remove tmp installation to free some space
		await io.rmRF(installPath);
		return resDir;
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
