import path from 'path';

import * as core from "@actions/core";
import * as io from "@actions/io";

import WindowsPlatform from './windowsplatform';

export default class MingwPlatform extends WindowsPlatform {
    private _isX64: boolean;

    public constructor(platform: string, version: string) {
        super(platform, version);
        this._isX64 = (platform == "mingw73_64");
    }

    public installPlatform(): string {
        if (this._isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }

    public makeName(): string {
        return "mingw32-make";
    }

    public installDirs(toolPath: string): [string, string] {
        const instDir: string = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }

    public addExtraEnvVars(basePath: string): void {
        super.addExtraEnvVars(basePath);
        core.addPath(path.join(basePath, "mingw", "bin"));
    }

    public extraTools(): string[] {
        const tools = super.extraTools();
        if (this._isX64)
            return [...tools, "qt.tools.win64_mingw73"];
        else
            return [...tools, "qt.tools.win32_mingw73"];
    }

    public async runPostInstall(cached: boolean, instDir: string): Promise<void> {
        await this.runPostInstall(cached, instDir);
        if (!cached) {
            const mingwPath = path.join(instDir, this._version, this.platform, "mingw");
            await io.rmRF(mingwPath);
            if (this._isX64)
                await io.mv(path.join(instDir, "Tools", "mingw730_64"), mingwPath);
            else
                await io.mv(path.join(instDir, "Tools", "mingw730_32"), mingwPath);
        }
    }
}
