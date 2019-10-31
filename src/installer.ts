import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as ex from '@actions/exec';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as glob from 'glob'
import * as semver from 'semver';
import * as restm from 'typed-rest-client/RestClient';

import * as qtScript from './qt-installer-script-base';

let osPlat: string = os.platform();
let osArch: string = os.arch();

let tempDirectory: string = process.env['RUNNER_TEMP'] || ''
if (!tempDirectory) {
	let baseLocation: string
	if (osArch == "win32") {
		// On windows use the USERPROFILE env variable
		baseLocation = process.env['USERPROFILE'] || 'C:\\'
	} else {
		if (process.platform === 'darwin')
			baseLocation = '/Users'
		else
			baseLocation = '/home'
	}
	tempDirectory = path.join(baseLocation, 'actions', 'temp')
}

export async function getQt(version: string, platform: string, packages: string, iArgs: string) {
	// install qdep
	const pythonPath: string = await io.which('python', true)
	await ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
	
	// check cache for Qt installation
	let toolPath: string | null = tc.find('qt', version, platform);

	if (!toolPath) {
		// download, extract, cache
		toolPath = await acquireQt(version, platform, packages, iArgs);
		core.debug('Qt installation is cached under ' + toolPath);
	}

	core.addPath(path.join(toolPath, "bin"));
	core.addPath(path.join(toolPath, "mingw", "bin"));
	await ex.exec("qmake", ["-version"]);
}

async function acquireQt(version: string, platform: string, packages: string, iArgs: string): Promise<string> {
	const fileName: string = getFileName(version);
	const downloadUrl: string = util.format('https://download.qt.io/official_releases/online_installers/%s', fileName);
	let downloadPath: string | null = null;
	try {
		downloadPath = await tc.downloadTool(downloadUrl);
	} catch (error) {
		console.log(error);
		throw `Failed to download version ${version}: ${error.message}`;
	}

	//
	// Run the installer
	//
	let installPath: string = osPlat == "win32" ? path.join(process.env['USERPROFILE'] || 'C:\\', 'qt') : path.join(tempDirectory, 'qt');
	const scriptPath: string = path.join(tempDirectory, 'qt-installer-script.qs');
	try {
		await fs.mkdir(path.join(tempDirectory, 'home'));
		await fs.writeFile(scriptPath, qtScript.generateScript(installPath, version, installPlatform(platform), packages));
	} catch (error) {
		console.log(error);
		throw `Failed to download version ${version}: ${error.message}`;
	}
	
	let instArgs = ["--script", scriptPath].concat(iArgs.split(" "));
	if (osPlat == "win32") {
		await io.mv(downloadPath, downloadPath + ".exe");
		downloadPath = downloadPath + ".exe";
		await ex.exec(downloadPath, instArgs);
	} else if (osPlat == "linux") {
		await fs.chmod(downloadPath, 0o755);
		const options: any = {};
		options.env = {
			"QT_QPA_PLATFORM": "minimal",
			"HOME": path.join(tempDirectory, 'home')
		};
		await ex.exec(downloadPath, instArgs, options);
	} else if (osPlat == "darwin") {
		await ex.exec("hdiutil",  ["attach", downloadPath]);
		const options: any = {};
		options.env = {
			"QT_QPA_PLATFORM": "minimal",
			"HOME": path.join(tempDirectory, 'home')
		};
		const vPath: string = glob.sync("/Volumes/qt-unified-mac-x64-*-online/qt-unified-mac-x64-*-online.app/Contents/MacOS/qt-unified-mac-x64-*-online")[0];
		await ex.exec(vPath, instArgs, options);
	}
	
	const qmakePath: string = path.join(installPath, version, platform, "bin", "qmake");
	await ex.exec(qmakePath, ["-version"]);
	const qdepPath: string = await io.which('qdep', true)
	await ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
	
	if (platform == "mingw73_64")
		io.mv(path.join(installPath, "Tools", "mingw730_64"), path.join(installPath, version, platform, "mingw"));
	else if (platform == "mingw73_32")
		io.mv(path.join(installPath, "Tools", "mingw730_32"), path.join(installPath, version, platform, "mingw"));

	//
	// Install into the local tool cache
	//
	return await tc.cacheDir(path.join(installPath, version, platform), 'qt', version, platform);
}

function getFileName(version: string): string { 
	let platform
	let arch
	let ext
	
	if (osPlat == "win32") {
		platform = "windows"
		arch = "x86"
		ext = "exe"
	} else if (osPlat == "linux") {
		platform = "linux"
		arch = osArch
		ext = "run"
	} else if (osPlat == "darwin") {
		platform = "mac"
		arch = "x64"
		ext = "dmg" 
	} else {
		let error = "Unsupported host platform";
		console.log(error);
		throw `Failed to download version ${version}: ${error}`;
	}

	const filename: string = util.format(
		'qt-unified-%s-%s-online.%s',
		platform,
		arch,
		ext
	);
	return filename;
}

function installPlatform(platform: string): string {
	if (osArch == "win32") {
		if (platform == "msvc2017_64")
			return "win64_msvc2017_64";
		else if (platform == "msvc2017")
			return "win32_msvc2017";
		else if (platform == "winrt_x64_msvc2017")
			return "win64_msvc2017_winrt_x64";
		else if (platform == "winrt_x86_msvc2017")
			return "win64_msvc2017_winrt_x86";
		else if (platform == "winrt_armv7_msvc2017")
			return "win64_msvc2017_winrt_armv7";
		else if (platform == "msvc2015_64")
			return "win64_msvc2015_64";
		else if (platform == "msvc2015")
			return "win32_msvc2015";
		else if (platform == "mingw73_64")
			return "win64_mingw73";
		else if (platform == "mingw73_32")
			return "win32_mingw73";
		else
			return platform;
	} else
		return platform;
}
