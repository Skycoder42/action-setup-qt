let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as ex from '@actions/exec';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as semver from 'semver';
import * as restm from 'typed-rest-client/RestClient';

import * as qtScript from './qt-installer-script-base';

let osPlat: string = os.platform();
let osArch: string = os.arch();

if (!tempDirectory) {
  let baseLocation;
  if (process.platform === 'win32') {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

export async function getQt(version: string, platform: string, pPackages: string, gPackages: string) {
  // check cache
  let toolPath: string;
  toolPath = tc.find('qt', version, platform);

  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireQt(version, platform, pPackages, gPackages);
    core.debug('Qt installation is cached under ' + toolPath);
  }

  core.addPath(path.join(toolPath, version, platform, "bin"));
}

async function acquireQt(version: string, platform: string, pPackages: string, gPackages: string): Promise<string> {
  const fileName: string = getFileName(version);
  const downloadUrl: string = util.format('https://download.qt.io/official_releases/online_installers/%s', fileName);
  let downloadPath: string | null = null;
  try {
    downloadPath = await tc.downloadTool(downloadUrl);
  } catch (error) {
    throw `Failed to download version ${version}: ${error}`;
  }

  //
  // Run the installer
  //
  const installPath: string = path.join(tempDirectory, 'qt');
  const scriptPath: string = path.join(tempDirectory, 'qt-installer-script.qs');
  try {
	await fs.mkdir(tempDirectory);
	await fs.writeFile(scriptPath, qtScript.generateScript(installPath, version, platform, pPackages, gPackages));
  } catch (error) {
    throw `Failed to download version ${version}: ${error}`;
  }
  
  if (osPlat == "win32") {
  } else if (osPlat == "linux") {
	await fs.chmod(downloadPath, 0o755);
	const options: any = {};
	options.env = {
		"QT_QPA_PLATFORM": "minimal"
	};
	await ex.exec(downloadPath, ["--script", scriptPath, "--addRepository", "https://install.skycoder42.de/qtmodules/linux_x64", "--verbose"], options);
  } else if (osPlat == "darwin") {
  }

  //
  // Install into the local tool cache
  //
  return await tc.cacheDir(installPath, 'qt', version, platform);
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
    core.debug(error);
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
