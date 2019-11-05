export interface IPlatform
{
    platform: string;

    addExtraEnvVars(basePath: string): void
    installerName(): string
    extraPackages(): Array<string> | null
    runInstaller(tool: string, args: Array<string>, instDir: string): Promise<void>
    qmakeName(): string
    installPlatform(): string
    formatInstallDir(instDir: string): string
}