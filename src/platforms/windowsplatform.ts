import { exec } from "@actions/exec";

import IPlatform, { CMakeConfig } from "./platform";
import VersionNumber from "../versionnumber";

export default abstract class WindowsPlatform implements IPlatform {
  protected _platform: string;
  protected _version: VersionNumber;

  public constructor(platform: string, version: VersionNumber) {
    this._platform = platform;
    this._version = version;
  }

  public abstract installPlatform(): string;
  public abstract makeName(): string;
  public abstract cmakeConfig(): CMakeConfig;
  public abstract installDirs(toolPath: string): [string, string];

  public addExtraEnvVars(_basePath: string): void {}

  public extraTools(): string[] {
    return [];
  }

  public async runPreInstall(): Promise<void> {
    await exec("choco", ["install", "openssl", "--x86", "-y", "--no-progress"]);
  }

  public async runPostInstall(
    _cached: boolean,
    _instDir: string
  ): Promise<void> {}

  public shellName(): string {
    return "cmd";
  }

  public qmakeName(): string {
    return "qmake.exe";
  }

  public testFlags(): string {
    return "";
  }
}
