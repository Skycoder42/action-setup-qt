"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
class UnixPlatform {
    constructor(platform) {
        this.platform = platform;
    }
    setupInstallDir() {
        const instDir = path.join(process.cwd(), "install");
        return [instDir, instDir];
    }
    addExtraEnvVars(_basePath) { }
    extraPackages() {
        return null;
    }
    qmakeName() {
        return "qmake";
    }
    installPlatform() {
        return this.platform;
    }
}
exports.UnixPlatform = UnixPlatform;
