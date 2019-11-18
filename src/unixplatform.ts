import * as path from 'path';

import { IPlatform } from "./platform";

export abstract class UnixPlatform implements IPlatform
{
    public platform: string; 

    public constructor(platform: string) {
        this.platform = platform;
    }

    public abstract aqtArgs(): [string, string, string];

    public qmakeName(): string {
        return "qmake";
    }

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {}

    public addExtraEnvVars(_basePath: string): void {}  
    
    public async runPostInstaller(_cacheHit: boolean, _installDir: string): Promise<void> {}

    public makeName(): string {
        return "make";
    }

    public testFlags(): string {
        return "-j1";
    }

    public setupInstallDir(_toolPath: string): [string, string] {
        const instDir: string = path.join(process.cwd(), "install");
        return [instDir, instDir];
    }
}