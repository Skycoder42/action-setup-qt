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
        core.addPath(path_1.default.join(basePath, "Tools", this._isX64 ? "mingw730_64" : "mingw730_32", "bin"));
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
