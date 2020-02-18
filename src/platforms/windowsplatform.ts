import * as ex from '@actions/exec';

import IPlatform from "./platform";
import VersionNumber from '../versionnumber';

export default abstract class WindowsPlatform implements IPlatform
{
    public platform: string;
    protected _version: VersionNumber;

    public constructor(platform: string, version: VersionNumber) {
        this.platform = platform;
        this._version = version;
    }
    
    public abstract installPlatform(): string
    public abstract makeName(): string
    public abstract installDirs(toolPath: string): [string, string]

    public addExtraEnvVars(_basePath: string): void {}

    public extraTools(): string[] {
        return [];
    }

    public async runPreInstall(): Promise<void> {
        await ex.exec("choco", ["install", "openssl", "--x86", "-y", "--no-progress"]);
    }

    public async runPostInstall(_cached: boolean, _instDir: string): Promise<void> {}

    public shellName(): string {
        return "cmd";
    }

    public qmakeName(): string {
        return "qmake.exe";
    }

    public testFlags(): string {
        return "";
    }
}
