import { join } from "path";

import LinuxPlatform from "./linuxplatform";
import { CMakeConfigMap } from "./platform";

export default class WasmPlatform extends LinuxPlatform {
  public cmakeArgs(): CMakeConfigMap {
    // https://github.com/forderud/QtWasm/blob/master/source/wasm.cmake
    return {
      CMAKE_TOOLCHAIN_FILE: join(
        process.env["EMSDK"]!,
        "upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
      ),
    };
  }
}
