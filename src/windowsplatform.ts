import * as path from 'path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as ex from '@actions/exec';

import { IPlatform } from "./platform";

export abstract class WindowsPlatform implements IPlatform
{
    public platform: string;
    protected version: string;

    public constructor(platform: string, version: string) {
        this.platform = platform;
        this.version = version;
    }
    
    public abstract aqtArgs(): [string, string, string];
    public abstract addExtraEnvVars(basePath: string): void;
    public abstract makeName(): string;
    public abstract setupInstallDir(toolPath: string): [string, string];

    public qmakeName(): string {
        return "qmake.exe";
    }

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {}

    public async runPostInstaller(_cacheHit: boolean, _installDir: string): Promise<void> {}

    public testFlags(): string {
        return "";
    }
}

export class MsvcPlatform extends WindowsPlatform
{
    public aqtArgs(): [string, string, string] {
        if (this.platform.includes("winrt"))
            return ["windows", "winrt", this.installPlatform()];
        else
            return ["windows", "desktop", this.installPlatform()];
    }

    public addExtraEnvVars(_basePath: string): void {
        core.exportVariable("VSINSTALLDIR", "C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Enterprise\\")
    }

    public makeName(): string {
        return "nmake";
    }

    public setupInstallDir(toolPath: string): [string, string] {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2)];
    }

    private installPlatform(): string {
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
            throw `Unsupported platform ${this.platform}`;
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

    public aqtArgs(): [string, string, string] {
        return ["windows", "desktop", this.installPlatform()];
    }

    public async runPostInstaller(cacheHit: boolean, installDir: string): Promise<void> {
        if (!cacheHit) {
            ex.exec("aqt", [
                "tool",
                "--outputdir", installDir,
                "windows",
                "tools_mingw",
                "7.3.0-1-201903151311",
                "qt.tools.win64_mingw730"
            ]);
        }
    }

    public addExtraEnvVars(basePath: string): void {
        core.addPath(path.join(basePath, "Tools", this.isX64 ? "mingw730_64" : "mingw730_32", "bin"));
    }

    public makeName(): string {
        return "mingw32-make";
    }
    
    public setupInstallDir(toolPath: string): [string, string] {
        const instDir: string = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }

    public installPlatform(): string {
        if (this.isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
}