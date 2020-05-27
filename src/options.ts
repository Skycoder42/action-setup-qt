import { getInput } from "@actions/core";
import VersionNumber from "./versionnumber";

export const enum Options {
  Version = "version",
  Platform = "platform",
  Packages = "packages",
  DeepSources = "deep-sources",
  FlatSources = "flat-sources",
  CacheMode = "cache-mode",
  Clean = "clean",
}

export const enum CacheMode {
  Default = "default",
  None = "none",
  Post = "post",
}

export type OptionTypes = {
  [Options.Version]: VersionNumber;
  [Options.Platform]: string;
  [Options.Packages]: string[];
  [Options.DeepSources]: string[];
  [Options.FlatSources]: string[];
  [Options.CacheMode]: CacheMode;
  [Options.Clean]: boolean;
};

const parseList = (list: string, seperator: string): string[] =>
  list
    .split(seperator)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

const parsers = {
  [Options.Version]: (v: string) => VersionNumber.fromString(v),
  [Options.Platform]: (v: string) => v,
  [Options.Packages]: (v: string) => parseList(v, ","),
  [Options.DeepSources]: (v: string) => parseList(v, " "),
  [Options.FlatSources]: (v: string) => parseList(v, " "),
  [Options.CacheMode]: (v: string) => v,
  [Options.Clean]: (v: string) => v === "true",
};

type Parser<T extends keyof OptionTypes> = (input: string) => OptionTypes[T];
const getParser = <T extends keyof OptionTypes>(key: T): Parser<T> => {
  return parsers[key] as Parser<T>;
};

export const getParam = <T extends keyof OptionTypes>(
  key: T,
  required: boolean
): OptionTypes[T] => {
  const input = getInput(key, { required });
  return getParser(key)(input);
};
