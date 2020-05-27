"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const core_1 = require("@actions/core");
const windowsplatform_1 = __importDefault(require("./windowsplatform"));
class MingwPlatform extends windowsplatform_1.default {
    constructor(platform, version) {
        super(platform, version);
        this._isX64 = (platform == "mingw73_64");
    }
    installPlatform() {
        if (this._isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
    makeName() {
        return "mingw32-make";
    }
    installDirs(toolPath) {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }
    addExtraEnvVars(basePath) {
        super.addExtraEnvVars(basePath);
        core_1.addPath(path_1.join(basePath, "Tools", this._isX64 ? "mingw730_64" : "mingw730_32", "bin"));
    }
    extraTools() {
        const tools = super.extraTools();
        if (this._isX64)
            return [...tools, "qt.tools.win64_mingw730"];
        else
            return [...tools, "qt.tools.win32_mingw730"];
    }
}
exports.default = MingwPlatform;
