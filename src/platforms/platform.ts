export default interface IPlatform
{
    platform: string;

    installPlatform(): string;
    addExtraEnvVars(basePath: string): void;
    extraTools(): string[];
    runPreInstall(): Promise<void>;
    runPostInstall(cached: boolean, instDir: string): Promise<void>;

    shellName(): string;
    makeName(): string;
    qmakeName(): string;
    installDirs(toolPath: string): [string, string];  // (outdir, installdir)
    testFlags(): string;
}