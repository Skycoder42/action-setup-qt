"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const core_1 = require("@actions/core");
const linuxplatform_1 = __importDefault(require("./linuxplatform"));
class AndroidPlatform extends linuxplatform_1.default {
    addExtraEnvVars(basePath) {
        super.addExtraEnvVars(basePath);
        core_1.exportVariable("ANDROID_SDK_ROOT", process.env["ANDROID_HOME"]);
        core_1.exportVariable("ANDROID_NDK_ROOT", path_1.join(process.env["ANDROID_HOME"], "ndk-bundle"));
    }
}
exports.default = AndroidPlatform;
