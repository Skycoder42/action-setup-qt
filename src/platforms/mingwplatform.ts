import { join } from 'path';

import { addPath } from "@actions/core";

import WindowsPlatform from './windowsplatform';
import VersionNumber from '../versionnumber';

export default class MingwPlatform extends WindowsPlatform {
    private _isX64: boolean;

    public constructor(platform: string, version: VersionNumber) {
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
        addPath(join(basePath,
            "Tools",
            this._isX64 ? "mingw730_64" : "mingw730_32",
            "bin"));
    }

    public extraTools(): string[] {
        const tools = super.extraTools();
        if (this._isX64)
            return [...tools, "qt.tools.win64_mingw730"];
        else
            return [...tools, "qt.tools.win32_mingw730"];
    }
}
