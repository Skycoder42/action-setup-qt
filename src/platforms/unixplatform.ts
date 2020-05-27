import { join } from "path";

import IPlatform from "./platform";

export default abstract class UnixPlatform implements IPlatform {
  protected _platform: string;

  public constructor(platform: string) {
    this._platform = platform;
  }

  public installPlatform(): string {
    return this._platform;
  }

  public addExtraEnvVars(_basePath: string): void {}

  public extraTools(): string[] {
    return [];
  }

  public async runPreInstall(): Promise<void> {}

  public async runPostInstall(
    _cached: boolean,
    _instDir: string
  ): Promise<void> {}

  public shellName(): string {
    return "bash";
  }

  public makeName(): string {
    return "make";
  }

  public qmakeName(): string {
    return "qmake";
  }

  public installDirs(_toolPath: string): [string, string] {
    const instDir: string = join(process.cwd(), "install");
    return [instDir, instDir];
  }

  public testFlags(): string {
    return "-j1";
  }
}
