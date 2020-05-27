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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const path_1 = require("path");
const fs_1 = require("fs");
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const windowsplatform_1 = __importDefault(require("./windowsplatform"));
const exists = util_1.promisify(fs_1.exists);
class MsvcPlatform extends windowsplatform_1.default {
    installPlatform() {
        for (const year of [2017, 2019]) {
            switch (this._platform) {
                case `msvc${year}_64`:
                    return `win64_msvc${year}_64`;
                case `msvc${year}`:
                    return `win32_msvc${year}`;
                case `winrt_x64_msvc${year}`:
                    return `win64_msvc${year}_winrt_x64`;
                case `winrt_x86_msvc${year}`:
                    return `win64_msvc${year}_winrt_x86`;
                case `winrt_armv7_msvc${year}`:
                    return `win64_msvc${year}_winrt_armv7`;
                default:
                    break;
            }
        }
        throw Error(`Unsupported platform ${this._platform}`);
    }
    makeName() {
        return "nmake";
    }
    installDirs(toolPath) {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2)];
    }
    runPostInstall(cached, instDir) {
        const _super = Object.create(null, {
            runPostInstall: { get: () => super.runPostInstall }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.runPostInstall.call(this, cached, instDir);
            // setup vcvarsall
            for (const vsVersion of [2019, 2017]) {
                const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
                const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
                if (yield exists(path_1.join(vcDir, "vcvarsall.bat"))) {
                    core_1.exportVariable("VSINSTALLDIR", vsDir);
                    const vcvLine = [".\\vcvarsall.bat", this.vcArch()];
                    const vcVersion = this.vcVersion(vsVersion);
                    if (vcVersion)
                        vcvLine.push(`-vcvars_ver=${vcVersion}`);
                    vcvLine.push("&&", "set");
                    let fullBuffer = "";
                    core_1.info(`Running ${vcvLine.join(" ")}`);
                    yield exec_1.exec(vcvLine.join(" "), undefined, {
                        cwd: vcDir,
                        windowsVerbatimArguments: true,
                        silent: true,
                        listeners: {
                            stdout: (data) => (fullBuffer += data.toString()),
                        },
                    });
                    for (const line of fullBuffer.split("\r\n")) {
                        const eqIdx = line.indexOf("=");
                        if (eqIdx > 0) {
                            const name = line.substr(0, eqIdx);
                            const value = line.substr(eqIdx + 1);
                            if (process.env[name] != value) {
                                core_1.debug(`Exporting env var ${name}=${value}`);
                                core_1.exportVariable(name, value);
                            }
                        }
                        else
                            core_1.warning(`Line is not an environment variable: ${line}`);
                    }
                    return;
                }
            }
            throw Error("Unable to find a valid Visual Studio installation");
        });
    }
    vcArch() {
        if (this._platform.includes("winrt"))
            return "x64_x86";
        else if (this._platform.includes("64"))
            return "x64";
        else
            return "x86";
    }
    vcVersion(vsVersion) {
        const clvMatch = this._platform.match(/msvc(\d{4})/);
        if (!clvMatch)
            throw Error(`Unsupported platform ${this._platform}`);
        const clVersion = Number(clvMatch[1]);
        if (vsVersion == clVersion)
            return null;
        else {
            switch (clVersion) {
                case 2017:
                    return "14.16";
                case 2015:
                    return "14.0";
                default:
                    throw Error(`Unsupported compiler version ${clVersion}`);
            }
        }
    }
}
exports.default = MsvcPlatform;
