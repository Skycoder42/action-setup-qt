export interface IPlatform
{
    platform: string;

    qmakeName(): string;

    runPreInstaller(cacheHit: boolean): Promise<void>;
    aqtArgs(): [string, string, string];
    runPostInstaller(cacheHit: boolean, installDir: string): Promise<void>;

    addExtraEnvVars(basePath: string): void;
    makeName(): string;
    testFlags(): string;
    setupInstallDir(toolPath: string): [string, string];
}