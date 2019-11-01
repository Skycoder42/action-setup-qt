"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UnixPlatform {
    constructor(platform) {
        this.platform = platform;
    }
    addExtraPaths(_basePath) { }
    extraPackages() {
        return null;
    }
    qmakeName(basePath) {
        return "qmake";
    }
    installPlatform() {
        return this.platform;
    }
}
exports.UnixPlatform = UnixPlatform;
