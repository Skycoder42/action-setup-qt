"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const exec_1 = require("@actions/exec");
class WindowsPlatform {
    constructor(platform, version) {
        this.platform = platform;
        this._version = version;
    }
    addExtraEnvVars(_basePath) { }
    extraTools() {
        return [];
    }
    runPreInstall() {
        return __awaiter(this, void 0, void 0, function* () {
            yield exec_1.exec("choco", ["install", "openssl", "--x86", "-y", "--no-progress"]);
        });
    }
    runPostInstall(_cached, _instDir) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    shellName() {
        return "cmd";
    }
    qmakeName() {
        return "qmake.exe";
    }
    testFlags() {
        return "";
    }
}
exports.default = WindowsPlatform;
