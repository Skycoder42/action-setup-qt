import { IPlatform } from "./platform";

export abstract class UnixPlatform implements IPlatform
{
    public platform: string; 

    public constructor(platform: string) {
        this.platform = platform;
    }

    public abstract installerName(): string
    public abstract runInstaller(tool: string, args: string[], instDir: string): Promise<void>
    
    public addExtraEnvVars(_basePath: string): void {}  

    public extraPackages(): string[] | null {
        return null;
    } 

    public qmakeName(): string {
        return "qmake";
    } 

    public installPlatform(): string {
        return this.platform;
    }
}