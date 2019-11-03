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
    
    public abstract installPlatform(): string
    
    public addExtraEnvVars(basePath: string): void {}

    public extraPackages(): string[] | null {
        return null;
    }

    public installerName(): string {
        return "qt-unified-windows-x86-online.exe";
    }

    public async runInstaller(tool: string, args: string[], _instDir: string): Promise<void> {
        let exePath = tool + ".exe";
		await io.mv(tool, exePath);
		await ex.exec(exePath, args);
    }

    public qmakeName(): string {
        return "qmake.exe";
    }
}

export class MsvcPlatform extends WindowsPlatform
{
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
        await super.runInstaller(tool, args, instDir);
        if (this.isX64)
            await io.mv(path.join(instDir, "Tools", "mingw730_64"), path.join(instDir, this.version, this.platform, "mingw"));
        else
            await io.mv(path.join(instDir, "Tools", "mingw730_32"), path.join(instDir, this.version, this.platform, "mingw"));
    }

    public installPlatform(): string {
        if (this.isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
}