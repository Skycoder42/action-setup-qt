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
import { Config, CacheMode } from "./config";

const exists = promisify(existsCb);

export default class Installer {
  private static CacheDir = join(".cache", "qt");
  private readonly _config: Config;
  private readonly _platform: IPlatform;
  private readonly _cacheKey: string;
  private readonly _downloader: Downloader;
  private readonly _tempDir: string;

  public constructor(config: Config) {
    this._tempDir = this.initTempDir(osPlatform());

    this._config = config;
    let host: string;
    let arch: string;
    switch (osPlatform()) {
      case "linux":
        if (this._config.platform.includes("android"))
          this._platform = new AndroidPlatform(this._config.platform);
        else this._platform = new LinuxPlatform(this._config.platform);
        host = "linux";
        arch = "x64";
        break;
      case "win32":
        if (this._config.platform.includes("mingw"))
          this._platform = new MingwPlatform(
            this._config.platform,
            this._config.version
          );
        else
          this._platform = new MsvcPlatform(
            this._config.platform,
            this._config.version
          );
        host = "windows";
        arch = "x86";
        break;
      case "darwin":
        this._platform = new MacosPlatform(this._config.platform);
        host = "mac";
        arch = "x64";
        break;
      default:
        throw `Install platform ${osPlatform()} is not supported by this action`;
    }

    this._cacheKey = `qt_${host}_${arch}_${this._config.platform}_${this._config.version}`;
    this._downloader = new Downloader(
      host,
      arch,
      this._config.version,
      this._config.platform,
      this._platform.installPlatform()
    );
  }

  public async main(): Promise<void> {
    // install qdep (don't cache to always get the latest version)
    await this.installQdep();

    // run pre install
    await this._platform.runPreInstall();

    // try to get Qt from cache, unless clean is specified
    let toolPath: string | null = null;
    if (this._config.cacheMode !== CacheMode.None && !this._config.clean) {
      debug(`Trying to restore Qt from cache with key: ${this._cacheKey} `);
      const hitKey = await restoreCache([Installer.CacheDir], this._cacheKey);
      if (
        hitKey &&
        (await exists(
          join(Installer.CacheDir, "bin", this._platform.qmakeName())
        ))
      ) {
        toolPath = resolve(Installer.CacheDir);
        info("Restored Qt from cache");
      }
    }

    // download, extract, cache
    if (!toolPath) {
      debug("Downloading and installing Qt");
      toolPath = await this.acquireQt();
      await this._platform.runPostInstall(false, toolPath);
      if (this._config.cacheMode === CacheMode.Default) {
        await this.storeCache();
      }
    } else {
      await this._platform.runPostInstall(true, toolPath);
    }
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

  public async post(): Promise<void> {
    if (this._config.cacheMode === CacheMode.Post) {
      await this.storeCache();
    }
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

  private async acquireQt(): Promise<string> {
    // download source definitions
    await this._downloader.addQtSource();
    for (const src of this._config.deepSources)
      await this._downloader.addSource(new URL(src), true);
    for (const src of this._config.flatSources)
      await this._downloader.addSource(new URL(src), false);

    // add packages
    debug(`Available modules: ${this._downloader.modules().join(", ")}`);
    for (const pkg of this._platform.extraTools())
      this._downloader.addDownload(pkg, true);
    for (const pkg of this._config.packages)
      this._downloader.addDownload(pkg, true);

    // download and install
    const installPath = join(this._tempDir, "qt");
    await this._downloader.installTo(installPath);
    const dataPath = join(
      installPath,
      this._config.version.toString(),
      this._config.platform
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
    return resolve(Installer.CacheDir);
  }

  private async generateQdepPrf(installPath: string) {
    // add qdep prf file
    const qmakePath = join(installPath, "bin", this._platform.qmakeName());
    const qdepPath = await which("qdep", true);
    await exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
    info("Successfully prepared qdep");
  }

  private shouldTest(): boolean {
    const platform = this._config.platform;
    if (
      platform.includes("android") ||
      platform.includes("wasm") ||
      platform.includes("winrt") ||
      platform.includes("ios")
    )
      return false;
    else return true;
  }

  private async storeCache(): Promise<void> {
    debug(`Caching Qt with key: ${this._cacheKey}`);
    try {
      await saveCache([Installer.CacheDir], this._cacheKey);
      info("Uploaded Qt to cache");
    } catch ({ message }) {
      warning(`Failed to save cache with error: ${message}`);
    }
  }
}
