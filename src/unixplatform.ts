import * as path from 'path';

import { IPlatform } from "./platform";

export abstract class UnixPlatform implements IPlatform
{
    public platform: string; 

    public constructor(platform: string) {
        this.platform = platform;
    }

    public abstract installerName(): string
    public abstract runInstaller(tool: string, args: string[], instDir: string): Promise<void>
    
    setupInstallDir(): [string, string] {
        const instDir: string = path.join(process.cwd(), "install");
        return [instDir, instDir];
    }

    public addExtraEnvVars(_basePath: string): void {}  

    public extraPackages(): string[] | null {
        return null;
    } 

    public qmakeName(): string {
        return "qmake";
    } 

    public async runPreInstaller(_cacheHit: boolean): Promise<void> {}
    
    public async runPostInstaller(): Promise<void> {}

    public installPlatform(): string {
        return this.platform;
    }
}