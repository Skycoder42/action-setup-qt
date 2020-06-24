import { promisify } from "util";
import { join } from "path";
import { exists as existsCB } from "fs";

import { exportVariable, info, debug, warning } from "@actions/core";
import { exec } from "@actions/exec";

import WindowsPlatform from "./windowsplatform";
import { CMakeConfig } from "./platform";

const exists = promisify(existsCB);

export default class MsvcPlatform extends WindowsPlatform {
  public installPlatform(): string {
    for (const year of [2017, 2019]) {
      switch (this._platform) {
        case `msvc${year}_64`:
          return `win64_msvc${year}_64`;
        case `msvc${year}`:
          return `win32_msvc${year}`;
        case `winrt_x64_msvc${year}`:
          return `win64_msvc${year}_winrt_x64`;
        case `winrt_x86_msvc${year}`:
          return `win64_msvc${year}_winrt_x86`;
        case `winrt_armv7_msvc${year}`:
          return `win64_msvc${year}_winrt_armv7`;
        default:
          break;
      }
    }

    throw Error(`Unsupported platform ${this._platform}`);
  }

  public makeName(): string {
    return "nmake";
  }

  public cmakeConfig(): CMakeConfig {
    return {
      generator: "NMake Makefiles",
      config: this.isWinrt()
        ? {
            CMAKE_SYSTEM_NAME: "WindowsStore",
            CMAKE_SYSTEM_VERSION: "10.0",
          }
        : {},
    };
  }

  public installDirs(toolPath: string): [string, string] {
    const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
    return [instDir, instDir.substr(2)];
  }

  public async runPostInstall(cached: boolean, instDir: string): Promise<void> {
    await super.runPostInstall(cached, instDir);

    // setup vcvarsall
    for (const vsVersion of [2019, 2017]) {
      const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
      const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
      if (await exists(join(vcDir, "vcvarsall.bat"))) {
        exportVariable("VSINSTALLDIR", vsDir);

        const vcvLine: string[] = [".\\vcvarsall.bat", this.vcArch()];
        const vcVersion = this.vcVersion(vsVersion);
        if (vcVersion) vcvLine.push(`-vcvars_ver=${vcVersion}`);
        vcvLine.push("&&", "set");

        let fullBuffer = "";
        info(`Running ${vcvLine.join(" ")}`);
        await exec(vcvLine.join(" "), undefined, {
          cwd: vcDir,
          windowsVerbatimArguments: true,
          silent: true,
          listeners: {
            stdout: (data) => (fullBuffer += data.toString()),
          },
        });

        for (const line of fullBuffer.split("\r\n")) {
          const eqIdx = line.indexOf("=");
          if (eqIdx > 0) {
            const name = line.substr(0, eqIdx);
            const value = line.substr(eqIdx + 1);
            if (process.env[name] != value) {
              debug(`Exporting env var ${name}=${value}`);
              exportVariable(name, value);
            }
          } else warning(`Line is not an environment variable: ${line}`);
        }
        return;
      }
    }

    throw Error("Unable to find a valid Visual Studio installation");
  }

  private isWinrt(): boolean {
    return this._platform.includes("winrt");
  }

  private vcArch(): string {
    if (this._platform.includes("arm64")) {
      return "x64_arm64";
    } else if (this._platform.includes("arm")) {
      return "x64_arm";
    } else if (this._platform.includes("64")) {
      return "x64";
    } else {
      return "x86";
    }
  }

  private vcVersion(vsVersion: number): string | null {
    const clvMatch = this._platform.match(/msvc(\d{4})/);
    if (!clvMatch) throw Error(`Unsupported platform ${this._platform}`);
    const clVersion: number = Number(clvMatch[1]);
    if (vsVersion == clVersion) return null;
    else {
      switch (clVersion) {
        case 2017:
          return "14.16";
        case 2015:
          return "14.0";
        default:
          throw Error(`Unsupported compiler version ${clVersion}`);
      }
    }
  }
}
