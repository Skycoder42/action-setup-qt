export type CMakeConfigMap = {
  [key: string]: string | boolean | number;
};

export type CMakeConfig = {
  generator: string;
  config: CMakeConfigMap;
};

export default interface IPlatform {
  installPlatform(): string;
  addExtraEnvVars(basePath: string): void;
  extraTools(): string[];
  runPreInstall(): Promise<void>;
  runPostInstall(cached: boolean, instDir: string): Promise<void>;

  shellName(): string;
  makeName(): string;
  qmakeName(): string;
  cmakeConfig(): CMakeConfig;
  installDirs(toolPath: string): [string, string]; // (outdir, installdir)
  testFlags(): string;
}
