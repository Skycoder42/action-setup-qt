import { promisify } from 'util';
import { join } from 'path';
import { exists as existsCB } from 'fs';

import { exportVariable, info, debug, warning } from "@actions/core";
import { exec } from "@actions/exec";

import WindowsPlatform from './windowsplatform';

const exists = promisify(existsCB);

export default class MsvcPlatform extends WindowsPlatform {
    public installPlatform(): string {
        switch (this.platform) {
            case "msvc2017_64":
                return "win64_msvc2017_64";
            case "msvc2017":
                return "win32_msvc2017";
            case "winrt_x64_msvc2017":
                return "win64_msvc2017_winrt_x64";
            case "winrt_x86_msvc2017":
                return "win64_msvc2017_winrt_x86";
            case "winrt_armv7_msvc2017":
                return "win64_msvc2017_winrt_armv7";
            default:
                throw Error(`Unsupported platform ${this.platform}`);
        }
    }

    public makeName(): string {
        return "nmake";
    }

    public installDirs(toolPath: string): [string, string] {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2)];
    }

    public async runPostInstall(cached: boolean, instDir: string): Promise<void> {
        await super.runPostInstall(cached, instDir);

        // setup vcvarsall
        for (let vsVersion of [2019, 2017]) {
            const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
            const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
            if (await exists(join(vcDir, "vcvarsall.bat"))) {
                exportVariable("VSINSTALLDIR", vsDir);

                const vcvLine: string[] = [".\\vcvarsall.bat", this.vcArch()];
                const vcVersion = this.vcVersion(vsVersion);
                if (vcVersion)
                    vcvLine.push(`-vcvars_ver=${vcVersion}`);
                vcvLine.push("&&", "set");

                let fullBuffer = '';
                info(`Running ${vcvLine.join(" ")}`);
                await exec(vcvLine.join(" "), undefined, {
                    cwd: vcDir,
                    windowsVerbatimArguments: true,
                    silent: true,
                    listeners: {
                        stdout: (data) => fullBuffer += data.toString()
                    }
                });

                for (let line of fullBuffer.split("\r\n")) {
                    const eqIdx = line.indexOf("=");
                    if (eqIdx > 0) {
                        const name = line.substr(0, eqIdx);
                        const value = line.substr(eqIdx + 1);
                        if (process.env[name] != value) {
                            debug(`Exporting env var ${name}=${value}`);
                            exportVariable(name, value);
                        }
                    } else
                        warning(`Line is not an environment variable: ${line}`);
                }
                return;
            }
        }

        throw Error("Unable to find a valid Visual Studio installation");
    }

    private vcArch(): string {
        if (this.platform.includes("winrt"))
            return "x64_x86";
        else if (this.platform.includes("64"))
            return "x64";
        else
            return "x86";
    }

    private vcVersion(vsVersion: number): string | null {
        const clvMatch = this.platform.match(/msvc(\d{4})/);
        if (!clvMatch)
            throw Error(`Unsupported platform ${this.platform}`);
        const clVersion: number = Number(clvMatch[1]);
        if (vsVersion == clVersion)
            return null;
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
