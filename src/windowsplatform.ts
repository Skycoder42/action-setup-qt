import * as path from 'path';
import { promises as fs } from 'fs';

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

    public abstract extraPackages(): string[] | null
    public abstract installPlatform(): string
    public abstract runInstaller(tool: string, args: string[], _instDir: string): Promise<void>
    public abstract qmakeName(): string;
    
    public addExtraEnvVars(basePath: string): void {}

    public installerName(): string {
        return "qt-unified-windows-x86-online.exe";
    }

    protected async runInstallerBin(tool: string, args: string[]): Promise<void> {
        let exePath = tool + ".exe";
		await io.mv(tool, exePath);
		await ex.exec(exePath, args);
    }
}

export class MsvcPlatform extends WindowsPlatform
{
    public extraPackages(): string[] | null {
        return null;
    }

    public async runInstaller(tool: string, args: string[], instDir: string): Promise<void> {
        await super.runInstallerBin(tool, args);
        await this.prepareVcTools(instDir);
    }

    public qmakeName(): string {
        return "qmake-vc.bat";
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

    private async prepareVcTools(instDir: string): Promise<void> {
        let vcTarget: string;
        let vcPlatform: string | null = null;
        const vcVersion: string = "-vcvars_ver=14.16";
        switch (this.platform) {
        case "winrt_x64_msvc2017":
            vcPlatform = "uwp";
        case "msvc2017_64":
            vcTarget = "x64";
            break;
        case "winrt_x86_msvc2017":
            vcPlatform = "uwp";
        case "msvc2017":
            vcTarget = "x64_x86";
            break;
        case "winrt_armv7_msvc2017":
            vcTarget = "x64_arm";
            vcPlatform = "uwp";
            break;
        default:
            throw `Unsupported platform ${this.platform}`;
        }

        let args: Array<string> = [vcTarget];
        if (vcPlatform)
            args.push(vcPlatform);
        args.push(vcVersion);
        
        await fs.writeFile(path.join(instDir, this.version, this.platform, "bin", "qmake-vc.bat"), `@echo off
call "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\VC\\Auxiliary\\Build\\vcvarsall.bat" ${vcTarget} ${vcPlatform ? vcPlatform : ""} ${vcVersion} || exit \B 1
"${path.join(instDir, this.version, this.platform, "bin", "qmake.exe")}" %*
`);
    }
}

export class MingwPlatform extends WindowsPlatform
{
    private isX64: boolean;

    public constructor(platform: string, version: string) {
        super(platform, version);
        this.isX64 = (platform == "mingw73_64");
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
        await super.runInstallerBin(tool, args);
        if (this.isX64)
            await io.mv(path.join(instDir, "Tools", "mingw730_64"), path.join(instDir, this.version, this.platform, "mingw"));
        else
            await io.mv(path.join(instDir, "Tools", "mingw730_32"), path.join(instDir, this.version, this.platform, "mingw"));
    }

    public qmakeName(): string {
        return "qmake.exe";
    }

    public installPlatform(): string {
        if (this.isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
}