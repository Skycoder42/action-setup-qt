import * as os from 'os';
import * as fssync from 'fs';
import * as path from 'path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as ex from '@actions/exec';

import { IPlatform } from './platform';
import { LinuxPlatform } from './linuxplatform';
import { AndroidPlatform } from './androidplatform';
import { MingwPlatform, MsvcPlatform } from './windowsplatform';
import { MacosPlatform } from './macosplatform';

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

	public async getQt(packages: string, extraArgs: string, cachedir: string): Promise<void> {
		// install qdep
		const pythonPath: string = await io.which('python', true);
		core.debug(`Using python: ${pythonPath}`);
		await ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
		core.info("Installed qdep");
		await ex.exec(pythonPath, ["-m", "pip", "install", "aqtinstall==0.6a1"]);
		core.info("Installed aqtinstall");
		
		// check caches for Qt installation
		let toolPath: string | null = null;
		if (cachedir) {
			if (fssync.existsSync(path.join(cachedir, "bin", this.platform.qmakeName()))) {
				toolPath = path.resolve(cachedir);
				core.debug('Found globally cached Qt: ' + toolPath);
			} else
				cachedir = "";
		} else
			toolPath = tc.find('qt', this.version, this.platform.platform);
	
		// download, extract, cache
		if (!toolPath) {
			await this.platform.runPreInstaller(false);
			core.debug('Downloading and installing Qt via aqtinstall');
			toolPath = await this.acquireQt(packages, cachedir, extraArgs);
			await this.platform.runPostInstaller(false, toolPath);
		} else {
			await this.platform.runPreInstaller(true);
			core.debug('Found locally cached Qt: ' + toolPath);
			await this.platform.runPostInstaller(true, toolPath);
		}
		core.info('Using Qt installation: ' + toolPath);

		// update output / env vars
		core.setOutput("qtdir", toolPath);
		core.addPath(path.join(toolPath, "bin"));
		this.platform.addExtraEnvVars(toolPath);
	
		await ex.exec("qmake", ["-version"]);
		await ex.exec("qmake", ["-query"]);

		// set outputs
		core.setOutput("make", this.platform.makeName());
		core.setOutput("tests", String(this.shouldTest()));
		core.setOutput("testflags", this.platform.testFlags());

		// set install dir, create artifact symlink
		const iPath: [string, string] = this.platform.setupInstallDir(toolPath);
		await io.mkdirP(iPath[0]);
		const instPath = path.join(iPath[0], os.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), "..", "..");
		core.setOutput('installdir', iPath[1]);
		core.setOutput('outdir', instPath);
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

	private async acquireQt(packages: string, cachedir: string, extraArgs: string): Promise<string> {
		// get aqt arguments
		const instDir = cachedir ? path.resolve(cachedir) : path.join(this.tempDir, "qt-install");
		const aqtArgs = this.platform.aqtArgs();
		let aqtCliArgs: Array<string> = [
			"install",
			"--outputdir", instDir,
			this.version,
			aqtArgs[0],
			aqtArgs[1],
			aqtArgs[2]
		];
		if (packages) {
			for (let pkg of packages.split(","))
				aqtCliArgs.push("--modules", pkg);
		}
		if (extraArgs) {
			for (let arg of extraArgs.split(" "))
				aqtCliArgs.push(arg);
		}

		// run aqt
		await io.mkdirP(instDir);
		await ex.exec("aqt", aqtCliArgs);
		
		// add qdep prf file
		const qmakePath: string = path.join(instDir, this.version, this.platform.platform, "bin", this.platform.qmakeName());
		const qdepPath: string = await io.which('qdep', true)
		await ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
		core.info("Successfully prepared qdep");
	
		// install into the local tool cache or global cache
		if (cachedir)
			return path.join(instDir, this.version, this.platform.platform);
		else
			return await tc.cacheDir(path.join(instDir, this.version, this.platform.platform), 'qt', this.version, this.platform.platform);
	}

	private shouldTest(): boolean {
		const platform = this.platform.platform;
		if (platform.includes("android") ||
			platform.includes("wasm") ||
			platform.includes("winrt") ||
			platform.includes("ios"))
			return false;
		else
			return true;
	}
}