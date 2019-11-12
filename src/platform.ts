export interface IPlatform
{
    platform: string;

    makeName(): string
    testFlags(): string
    setupInstallDir(toolPath: string): [string, string]
    addExtraEnvVars(basePath: string): void
    installerName(): string
    extraPackages(): Array<string> | null
    runPreInstaller(cacheHit: boolean): Promise<void>;
    runInstaller(tool: string, args: Array<string>, instDir: string): Promise<void>
    runPostInstaller(): Promise<void>;
    qmakeName(): string
    installPlatform(): string
}