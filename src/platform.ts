export interface IPlatform {
    platform: string;

    addExtraPaths(basePath: string): void
    installerName(): string
    extraPackages(): Array<string> | null
    runInstaller(tool: string, args: Array<string>, instDir: string): Promise<void>
    qmakeName(basePath: string): string
    installPlatform(): string
}