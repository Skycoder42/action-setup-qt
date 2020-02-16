export default interface IPlatform
{
    platform: string;

    installPlatform(): string;
    addExtraEnvVars(basePath: string): void;
    extraTools(): string[];
    runPostInstall(cached: boolean, instDir: string): Promise<void>;

    makeName(): string;
    qmakeName(): string;
    installDirs(toolPath: string): [string, string];  // ()
    testFlags(): string;
}