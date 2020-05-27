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
    }
    installPlatform() {
        for (const minGwVersion of [81, 73]) {
            switch (this.platform) {
                case `mingw${minGwVersion}_64`:
                    return `win64_mingw${minGwVersion}`;
                case `mingw${minGwVersion}_32`:
                    return `win32_mingw${minGwVersion}`;
                default:
                    break;
            }
        }
        throw Error(`Unsupported platform ${this.platform}`);
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
        core_1.addPath(path_1.join(basePath, "Tools", this.platform.substr(0, 7) + "0" + this.platform.substr(8), "bin"));
    }
    extraTools() {
        const tools = super.extraTools();
        return [...tools, `qt.tools.${this.installPlatform}0`];
    }
}
exports.default = MingwPlatform;
