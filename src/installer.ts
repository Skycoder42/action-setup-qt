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
  tempDirectory = path.join(baseLocation, 'runner', 'work', '_temp');
}

export async function getQt(version: string, platform: string, packages: string, iArgs: string) {
  // check cache
  let toolPath: string | null = tc.find('qt', version, platform);

  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireQt(version, platform, packages, iArgs);
    core.debug('Qt installation is cached under ' + toolPath);
  }

  core.addPath(path.join(toolPath, "bin"));
  await io.which('qmake', true);
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
  const installPath: string = path.join(tempDirectory, 'qt');
  const scriptPath: string = path.join(tempDirectory, 'qt-installer-script.qs');
  try {
	await fs.mkdir(path.join(tempDirectory, 'home'));
	await fs.writeFile(scriptPath, qtScript.generateScript(installPath, version, platform, packages));
  } catch (error) {
    console.log(error);
    throw `Failed to download version ${version}: ${error.message}`;
  }
  
  if (osPlat == "win32") {
  } else if (osPlat == "linux") {
	await fs.chmod(downloadPath, 0o755);
	const options: any = {};
	options.env = {
		"QT_QPA_PLATFORM": "minimal",
		"HOME": path.join(tempDirectory, 'home')
	};
	await ex.exec(downloadPath, ["--script", scriptPath].concat(iArgs.split(" ")), options);
  } else if (osPlat == "darwin") {
  }

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
