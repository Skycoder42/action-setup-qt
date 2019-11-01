import * as path from 'path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as ex from '@actions/exec';

import { IPlatform } from "./platform";
import M = require('minimatch');

export class WindowsPlatform implements IPlatform
{
    public platform: string; 

    public constructor(platform: string) {
        this.platform = platform;
    }

    public addExtraPaths(basePath: string): void {}   
    
    public installerName(): string {
        return "qt-unified-windows-x86-online.exe";
    }

    public extraPackages(): string[] | null {
        return null;
    }

    public async runInstaller(tool: string, args: string[], _instDir: string): Promise<void> {
        let exePath = tool + ".exe";
		await io.mv(tool, exePath);
		await ex.exec(exePath, args);
    }

    public qmakeName(basePath: string): string {
        return "qmake.exe";
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
        case "mingw73_64":
            return "win64_mingw73";
        case "mingw73_32":
            return "win32_mingw73";
        default:
            return this.platform;
        }
    }
}

export class MingwPlatform extends WindowsPlatform
{
    private version: string;
    private isX64: boolean;

    public constructor(platform: string, version: string) {
        super(platform);
        this.version = version;
        this.isX64 = (platform == "mingw73_64");
    }

    public addExtraPaths(basePath: string): void {
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
}