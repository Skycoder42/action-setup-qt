import * as path from 'path';
import * as fs from 'fs';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as ex from '@actions/exec';

import { IPlatform } from "./platform";
import { fstat } from 'fs';

export abstract class WindowsPlatform implements IPlatform
{
    public platform: string;
    protected version: string;

    public constructor(platform: string, version: string) {
        this.platform = platform;
        this.version = version;
    }
    
    public abstract makeName(): string
    public abstract setupInstallDir(toolPath: string): [string, string]
    public abstract installPlatform(): string
    public abstract runInstaller(tool: string, args: string[], _instDir: string): Promise<void>

    testFlags(): string {
        return "";
    }

    public addExtraEnvVars(_basePath: string): void {}

    public extraPackages(): string[] | null {
        return null;
    }

    public installerName(): string {
        return "qt-unified-windows-x86-online.exe";
    }

    public qmakeName(): string {
        return "qmake.exe";
    }

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {
        await ex.exec("choco", ["install", "openssl", "--x86", "-y"]);
    }

    public async runPostInstaller(): Promise<void> {}

    protected async runQtInstaller(tool: string, args: string[]): Promise<void> {
        let exePath = tool + ".exe";
		await io.mv(tool, exePath);
		await ex.exec(exePath, args);
    }
}

export class MsvcPlatform extends WindowsPlatform
{
    public makeName(): string {
        return "nmake";
    }

    public setupInstallDir(toolPath: string): [string, string] {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2)];
    }

    public async runInstaller(tool: string, args: string[], _instDir: string): Promise<void> {
        await this.runQtInstaller(tool, args);
    }

    public async runPostInstaller(): Promise<void> {
        // setup vcvarsall
        for (let vsVersion of [2019, 2017]) {
            const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
            const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
            if (fs.existsSync(path.join(vcDir, "vcvarsall.bat"))) {
                core.exportVariable("VSINSTALLDIR", vsDir);

                let vcvLine: string[] = [".\\vcvarsall.bat", this.vcArch()];
                const vcVersion = this.vcVersion(vsVersion);
                if (vcVersion)
                    vcvLine.push(`-vcvars_ver=${vcVersion}`);
                vcvLine.push("&&", "set");
                let fullBuffer = '';
                core.info(`Running ${vcvLine.join(" ")}`);
                await ex.exec(vcvLine.join(" "), undefined, {
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
                            core.debug(`Exporting env var ${name}=${value}`);
                            core.exportVariable(name, value);
                        }
                    } else
                        core.warning(`Line is not an environment variable: ${line}`);
                }
                return;
            }
        }
        throw Error("Unable to find a valid Visual Studio installation");
    }

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
            switch(clVersion) {
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

export class MingwPlatform extends WindowsPlatform
{
    private isX64: boolean;

    public constructor(platform: string, version: string) {
        super(platform, version);
        this.isX64 = (platform == "mingw73_64");
    }

    public makeName(): string {
        return "mingw32-make";
    }
    
    public setupInstallDir(toolPath: string): [string, string] {
        const instDir: string = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }

    public addExtraEnvVars(basePath: string): void {
        core.addPath(path.join(basePath, "mingw", "bin"));
    }

    public extraPackages(): string[] | null {
        if (this.isX64)
            return ["qt.tools.win64_mingw73"];
        else
            return ["qt.tools.win32_mingw73"];
    }

    public async runInstaller(tool: string, args: string[], instDir: string): Promise<void> {
        await this.runQtInstaller(tool, args);
        const mingwPath = path.join(instDir, this.version, this.platform, "mingw");
        if (this.isX64)
            await io.mv(path.join(instDir, "Tools", "mingw730_64"), mingwPath);
        else
            await io.mv(path.join(instDir, "Tools", "mingw730_32"), mingwPath);
    }

    public installPlatform(): string {
        if (this.isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
}