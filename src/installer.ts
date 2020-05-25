import { platform as osPlatform } from "os";
import { join, resolve } from "path";
import { exists as existsCb } from "fs";
import { URL } from "url";
import { promisify } from "util";

import { debug, info, setOutput, addPath, warning } from "@actions/core";
import { mv, rmRF, mkdirP, which } from "@actions/io";
import { exec } from "@actions/exec";
import { restoreCache, saveCache } from "@actions/cache";

import IPlatform from "./platforms/platform";
import LinuxPlatform from "./platforms/linuxplatform";
import AndroidPlatform from "./platforms/androidplatform";
import MingwPlatform from "./platforms/mingwplatform";
import MsvcPlatform from "./platforms/msvcplatform";
import MacosPlatform from "./platforms/macosplatform";

import Downloader from "./downloader";
import VersionNumber from "./versionnumber";

const exists = promisify(existsCb);

export default class Installer {
  private static CacheDir = join(".cache", "qt");
  private readonly _version: VersionNumber;
  private readonly _platform: IPlatform;
  private readonly _cacheKey: string;
  private readonly _downloader: Downloader;
  private readonly _tempDir: string;

  public constructor(version: VersionNumber, platform: string) {
    this._tempDir = this.initTempDir(osPlatform());

    this._version = version;
    let host: string;
    let arch: string;
    switch (osPlatform()) {
      case "linux":
        if (platform.includes("android"))
          this._platform = new AndroidPlatform(platform);
        else this._platform = new LinuxPlatform(platform);
        host = "linux";
        arch = "x64";
        break;
      case "win32":
        if (platform.includes("mingw"))
          this._platform = new MingwPlatform(platform, this._version);
        else this._platform = new MsvcPlatform(platform, this._version);
        host = "windows";
        arch = "x86";
        break;
      case "darwin":
        this._platform = new MacosPlatform(platform);
        host = "mac";
        arch = "x64";
        break;
      default:
        throw `Install platform ${osPlatform()} is not supported by this action`;
    }

    this._cacheKey = `qt_${host}_${arch}_${this._platform.platform}_${version}`;
    this._downloader = new Downloader(
      host,
      arch,
      this._version,
      this._platform.platform,
      this._platform.installPlatform()
    );
  }

  public async getQt(
    packages: string[],
    deepSrc: string[],
    flatSrc: string[],
    clean: boolean
  ): Promise<void> {
    // install qdep (don't cache to always get the latest version)
    await this.installQdep();

    // run pre install
    await this._platform.runPreInstall();

    // try to get Qt from cache, unless clean is specified
    let toolPath: string | null = null;
    if (!clean) {
      debug(`Trying to restore Qt from cache with key: ${this._cacheKey} `);
      const hitKey = await restoreCache([Installer.CacheDir], this._cacheKey);
      if (
        hitKey &&
        (await exists(
          join(Installer.CacheDir, "bin", this._platform.qmakeName())
        ))
      ) {
        toolPath = resolve(Installer.CacheDir);
        debug(`Restored Qt from cache to path: ${toolPath}`);
      }
    }

    // download, extract, cache
    if (!toolPath) {
      debug("Downloading and installing Qt");
      toolPath = await this.acquireQt(packages, deepSrc, flatSrc);
      debug(`Caching Qt with key: ${this._cacheKey}`);
      await this._platform.runPostInstall(false, toolPath);
      try {
        await saveCache([toolPath], this._cacheKey);
      } catch ({ message }) {
        warning(`Failed to save cache with error: ${message}`);
      }
    } else await this._platform.runPostInstall(true, toolPath);
    info("Using Qt installation: " + toolPath);

    // generate qdep prf
    await this.generateQdepPrf(toolPath);

    // update output / env vars
    setOutput("qtdir", toolPath);
    addPath(join(toolPath, "bin"));
    this._platform.addExtraEnvVars(toolPath);

    // log stuff
    await exec("qmake", ["-version"]);
    await exec("qmake", ["-query"]);

    // set outputs
    setOutput("shell", this._platform.shellName());
    setOutput("make", this._platform.makeName());
    setOutput("tests", String(this.shouldTest()));
    setOutput("testflags", this._platform.testFlags());

    // set install dir, create artifact symlink
    const iPath = this._platform.installDirs(toolPath);
    await mkdirP(iPath[0]);
    const instPath = join(
      iPath[0],
      osPlatform() == "win32" ? toolPath.substr(3) : toolPath.substr(1),
      "..",
      ".."
    );
    setOutput("outdir", instPath);
    setOutput("installdir", iPath[1]);
  }

  private initTempDir(platform: NodeJS.Platform): string {
    let tempDirectory: string = process.env["RUNNER_TEMP"] || "";
    if (!tempDirectory) {
      let baseLocation: string;
      if (platform == "win32") {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env["USERPROFILE"] || "C:\\";
      } else {
        if (platform === "darwin") baseLocation = "/Users";
        else baseLocation = "/home";
      }
      tempDirectory = join(baseLocation, "actions", "temp");
    }
    return tempDirectory;
  }

  private async installQdep(): Promise<void> {
    const pythonPath: string = await which("python", true);
    debug(`Using python: ${pythonPath}`);
    await exec(pythonPath, ["-m", "pip", "install", "qdep"]);
    const qdepPath = await which("qdep", true);
    await exec(qdepPath, ["--version"]);
    info("Installed qdep");
  }

  private async acquireQt(
    packages: string[],
    deepSrc: string[],
    flatSrc: string[]
  ): Promise<string> {
    // download source definitions
    await this._downloader.addQtSource();
    for (const src of deepSrc)
      await this._downloader.addSource(new URL(src), true);
    for (const src of flatSrc)
      await this._downloader.addSource(new URL(src), false);

    // add packages
    debug(`Available modules: ${this._downloader.modules().join(", ")}`);
    for (const pkg of this._platform.extraTools())
      this._downloader.addDownload(pkg, true);
    for (const pkg of packages) this._downloader.addDownload(pkg, true);

    // download and install
    const installPath = join(this._tempDir, "qt");
    await this._downloader.installTo(installPath);
    const dataPath = join(
      installPath,
      this._version.toString(),
      this._platform.platform
    );

    // move tools
    const oldToolPath = join(installPath, "Tools");
    if (await exists(oldToolPath))
      await mv(oldToolPath, join(dataPath, "Tools"));

    // move out of install dir to seperate dir
    await rmRF(Installer.CacheDir);
    await mv(dataPath, Installer.CacheDir);

    // remove tmp installation to free some space
    await rmRF(installPath);
    return Installer.CacheDir;
  }

  private async generateQdepPrf(installPath: string) {
    // add qdep prf file
    const qmakePath = join(installPath, "bin", this._platform.qmakeName());
    const qdepPath = await which("qdep", true);
    await exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
    info("Successfully prepared qdep");
  }

  private shouldTest(): boolean {
    const platform = this._platform.platform;
    if (
      platform.includes("android") ||
      platform.includes("wasm") ||
      platform.includes("winrt") ||
      platform.includes("ios")
    )
      return false;
    else return true;
  }
}
