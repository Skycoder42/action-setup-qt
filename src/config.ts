import { getInput, debug } from "@actions/core";
import VersionNumber from "./versionnumber";

export const enum CacheMode {
  Default = "default",
  None = "none",
  Post = "post",
}

export type Config = {
  version: VersionNumber;
  platform: string;
  packages: string[];
  deepSources: string[];
  flatSources: string[];
  cacheMode: CacheMode;
  clean: boolean;
};

const parseList = (list: string, seperator: string): string[] =>
  list
    .split(seperator)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

export const loadConfig = (): Config => {
  const config: Config = {
    version: VersionNumber.fromString(getInput("version", { required: true })),
    platform: getInput("platform", { required: true }),
    packages: parseList(getInput("packages"), ","),
    deepSources: parseList(getInput("deep-sources"), " "),
    flatSources: parseList(getInput("flat-sources"), " "),
    cacheMode: getInput("cache-mode") as CacheMode,
    clean: getInput("clean") === "true",
  };
  debug(`Using config: ${JSON.stringify(config, undefined, 2)}`);
  return config;
};
