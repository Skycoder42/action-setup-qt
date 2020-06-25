"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const linuxplatform_1 = __importDefault(require("./linuxplatform"));
class WasmPlatform extends linuxplatform_1.default {
    cmakeArgs() {
        // https://github.com/forderud/QtWasm/blob/master/source/wasm.cmake
        return {
            CMAKE_TOOLCHAIN_FILE: path_1.join(process.env["EMSDK"], "upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"),
        };
    }
}
exports.default = WasmPlatform;
