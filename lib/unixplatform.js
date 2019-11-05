"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UnixPlatform {
    constructor(platform) {
        this.platform = platform;
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
    formatInstallDir(instDir) {
        return instDir;
    }
}
exports.UnixPlatform = UnixPlatform;
