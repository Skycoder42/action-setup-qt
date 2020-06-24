import LinuxPlatform from "./linuxplatform";
import { CMakeConfigMap } from "./platform";

export default class WasmPlatform extends LinuxPlatform {
  public cmakeArgs(): CMakeConfigMap {
    // https://github.com/forderud/QtWasm/blob/master/source/wasm.cmake
    return {
      CMAKE_TOOLCHAIN_FILE:
        "$ENV{EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake",
      CMAKE_EXECUTABLE_SUFFIX: ".wasm.js",
      CMAKE_EXE_LINKER_FLAGS: "-s WASM=1 -s EXPORTED_FUNCTIONS='[_main]",
    };
  }
}
