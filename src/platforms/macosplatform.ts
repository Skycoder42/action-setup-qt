import { addPath } from "@actions/core";
import { exec } from "@actions/exec";

import UnixPlatform from "./unixplatform";
import { CMakeConfigMap } from "./platform";

export default class MacosPlatform extends UnixPlatform {
  public addExtraEnvVars(basePath: string): void {
    super.addExtraEnvVars(basePath);
    addPath("/usr/local/opt/make/libexec/gnubin");
  }

  public async runPreInstall(): Promise<void> {
    await super.runPreInstall();
    await exec("brew", ["update"]);
    await exec("brew", ["install", "make", "p7zip"]);
  }

  public cmakeArgs(): CMakeConfigMap {
    const hunterVersion = "v0.23.259";
    const args: CMakeConfigMap = {
      HUNTER_URL: `https://github.com/cpp-pm/hunter/archive/${hunterVersion}.tar.gz`,
      HUNTER_SHA1: "59541baf106b91ae4fec32e6c6b0990d04c7f6be",
    };
    if (this._platform === "ios") {
      args["CMAKE_SYSTEM_NAME"] = "iOS";
    }
    return args;
  }
}
