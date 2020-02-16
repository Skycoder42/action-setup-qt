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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const core = __importStar(require("@actions/core"));
const ex = __importStar(require("@actions/exec"));
const windowsplatform_1 = __importDefault(require("./windowsplatform"));
class MsvcPlatform extends windowsplatform_1.default {
    installPlatform() {
        switch (this.platform) {
            case "msvc2017_64":
                return "win64_msvc2017_64";
            case "msvc2017":
                return "win32_msvc2017";
            case "winrt_x64_msvc2017":
                return "win64_msvc2017_winrt_x64";
            case "winrt_x86_msvc2017":
                return "win64_msvc2017_winrt_x86";
            case "winrt_armv7_msvc2017":
                return "win64_msvc2017_winrt_armv7";
            default:
                throw Error(`Unsupported platform ${this.platform}`);
        }
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
            for (let vsVersion of [2019, 2017]) {
                const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
                const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
                if (fs_1.default.existsSync(path_1.default.join(vcDir, "vcvarsall.bat"))) {
                    core.exportVariable("VSINSTALLDIR", vsDir);
                    const vcvLine = [".\\vcvarsall.bat", this.vcArch()];
                    const vcVersion = this.vcVersion(vsVersion);
                    if (vcVersion)
                        vcvLine.push(`-vcvars_ver=${vcVersion}`);
                    vcvLine.push("&&", "set");
                    let fullBuffer = '';
                    core.info(`Running ${vcvLine.join(" ")}`);
                    yield ex.exec(vcvLine.join(" "), undefined, {
                        cwd: vcDir,
                        windowsVerbatimArguments: true,
                        silent: true,
                        listeners: {
                            stdout: (data) => fullBuffer += data.toString()
                        }
                    });
                    for (let line of fullBuffer.split("\r\n")) {
                        const eqIdx = line.indexOf("=");
                        if (eqIdx > 0) {
                            const name = line.substr(0, eqIdx);
                            const value = line.substr(eqIdx + 1);
                            if (process.env[name] != value) {
                                core.debug(`Exporting env var ${name}=${value}`);
                                core.exportVariable(name, value);
                            }
                        }
                        else
                            core.warning(`Line is not an environment variable: ${line}`);
                    }
                    return;
                }
            }
            throw Error("Unable to find a valid Visual Studio installation");
        });
    }
    vcArch() {
        if (this.platform.includes("winrt"))
            return "x64_x86";
        else if (this.platform.includes("64"))
            return "x64";
        else
            return "x86";
    }
    vcVersion(vsVersion) {
        const clvMatch = this.platform.match(/msvc(\d{4})/);
        if (!clvMatch)
            throw Error(`Unsupported platform ${this.platform}`);
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