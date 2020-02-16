"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const core = __importStar(require("@actions/core"));
const linuxplatform_1 = __importDefault(require("./linuxplatform"));
class AndroidPlatform extends linuxplatform_1.default {
    addExtraEnvVars(basePath) {
        super.addExtraEnvVars(basePath);
        core.exportVariable("ANDROID_SDK_ROOT", process.env["ANDROID_HOME"]);
        core.exportVariable("ANDROID_NDK_ROOT", path_1.default.join(process.env["ANDROID_HOME"], "ndk-bundle"));
    }
}
exports.default = AndroidPlatform;
