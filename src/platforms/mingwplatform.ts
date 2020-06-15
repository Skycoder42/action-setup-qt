import { join } from "path";

import { addPath } from "@actions/core";

import WindowsPlatform from "./windowsplatform";
import VersionNumber from "../versionnumber";

export default class MingwPlatform extends WindowsPlatform {
  public installPlatform(): string {
    for (const minGwVersion of [81, 73]) {
      switch (this._platform) {
        case `mingw${minGwVersion}_64`:
          return `win64_mingw${minGwVersion}`;
        case `mingw${minGwVersion}_32`:
          return `win32_mingw${minGwVersion}`;
        default:
          break;
      }
    }

    throw Error(`Unsupported platform ${this._platform}`);
  }

  public makeName(): string {
    return "mingw32-make";
  }

  public installDirs(toolPath: string): [string, string] {
    const instDir: string = `${toolPath.substr(
      0,
      2
    )}\\Users\\runneradmin\\install`;
    return [instDir, instDir.substr(2).replace(/\\/g, "/")];
  }

  public addExtraEnvVars(basePath: string): void {
    super.addExtraEnvVars(basePath);
    addPath(
      join(
        basePath,
        "Tools",
        this._platform.substr(0, 7) + "0" + this._platform.substr(7),
        "bin"
      )
    );
  }

  public extraTools(): string[] {
    const tools = super.extraTools();
    return [...tools, `qt.tools.${this.installPlatform()}0`];
  }
}
