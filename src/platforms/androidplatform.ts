import { join } from "path";

import { exportVariable } from "@actions/core";

import LinuxPlatform from "./linuxplatform";
import { CMakeConfigMap } from "./platform";

export default class AndroidPlatform extends LinuxPlatform {
  public addExtraEnvVars(basePath: string): void {
    super.addExtraEnvVars(basePath);
    exportVariable("ANDROID_SDK_ROOT", process.env["ANDROID_HOME"]!);
    exportVariable(
      "ANDROID_NDK_ROOT",
      join(process.env["ANDROID_HOME"]!, "ndk-bundle")
    );
  }

  public cmakeArgs(): CMakeConfigMap {
    return {
      CMAKE_TOOLCHAIN_FILE:
        "$ENV{ANDROID_SDK_ROOT}/ndk-bundle/build/cmake/android.toolchain.cmake",
      CMAKE_FIND_ROOT_PATH_MODE_PACKAGE: "BOTH",
      ANDROID_ABI: "arm64-v8a",
      "ANDROID_BUILD_ABI_arm64-v8a": true,
      ANDROID_BUILD_ABI_armeabi: true,
      ANDROID_BUILD_ABI_x86: true,
      ANDROID_BUILD_ABI_x86_64: true,
    };
  }
}
