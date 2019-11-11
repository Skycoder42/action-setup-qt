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
    
    public abstract makeName(): string
    public abstract setupInstallDir(): [string, string]
    public abstract installPlatform(): string
    public abstract addExtraEnvVars(basePath: string): void;
    public abstract runInstaller(tool: string, args: string[], _instDir: string): Promise<void>

    testFlags(): string {
        return "";
    }

    public extraPackages(): string[] | null {
        return null;
    }

    public installerName(): string {
        return "qt-unified-windows-x86-online.exe";
    }

    public qmakeName(): string {
        return "qmake.exe";
    }

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {}

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

    public setupInstallDir(): [string, string] {
        const instDir: string = "C:\\Users\\runneradmin\\install";
        return [instDir, instDir.substr(2)];
    }

    public addExtraEnvVars(basePath: string): void {
        core.exportVariable("VSINSTALLDIR", "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise\\")
    }

    public async runInstaller(tool: string, args: string[], _instDir: string): Promise<void> {
        await this.runQtInstaller(tool, args);
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

    public makeName(): string {
        return "mingw32-make";
    }
    
    public setupInstallDir(): [string, string] {
        const instDir: string = "C:\\Users\\runneradmin\\install";
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