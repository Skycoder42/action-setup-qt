"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const linuxplatform_1 = __importDefault(require("./linuxplatform"));
class WasmPlatform extends linuxplatform_1.default {
    cmakeArgs() {
        // https://github.com/forderud/QtWasm/blob/master/source/wasm.cmake
        return {
            CMAKE_TOOLCHAIN_FILE: "$ENV{EMSDK}/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake",
            CMAKE_EXECUTABLE_SUFFIX: ".wasm.js",
            CMAKE_EXE_LINKER_FLAGS: "-s WASM=1 -s EXPORTED_FUNCTIONS='[_main]",
        };
    }
}
exports.default = WasmPlatform;
