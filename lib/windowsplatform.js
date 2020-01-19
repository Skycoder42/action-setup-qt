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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const ex = __importStar(require("@actions/exec"));
class WindowsPlatform {
    constructor(platform, version) {
        this.platform = platform;
        this.version = version;
    }
    testFlags() {
        return "";
    }
    addExtraEnvVars(_basePath) { }
    extraPackages() {
        return null;
    }
    installerName() {
        return "qt-unified-windows-x86-online.exe";
    }
    qmakeName() {
        return "qmake.exe";
    }
    runPreInstaller(_cacheHit) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ex.exec("choco", ["install", "openssl", "--x86", "-y", "--no-progress"]);
        });
    }
    runPostInstaller() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    runQtInstaller(tool, args) {
        return __awaiter(this, void 0, void 0, function* () {
            let exePath = tool + ".exe";
            yield io.mv(tool, exePath);
            yield ex.exec(exePath, args);
        });
    }
}
exports.WindowsPlatform = WindowsPlatform;
class MsvcPlatform extends WindowsPlatform {
    makeName() {
        return "nmake";
    }
    setupInstallDir(toolPath) {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2)];
    }
    runInstaller(tool, args, _instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runQtInstaller(tool, args);
        });
    }
    runPostInstaller() {
        return __awaiter(this, void 0, void 0, function* () {
            // setup vcvarsall
            for (let vsVersion of [2019, 2017]) {
                const vsDir = `${process.env["ProgramFiles(x86)"]}\\Microsoft Visual Studio\\${vsVersion}\\Enterprise\\`;
                const vcDir = `${vsDir}VC\\Auxiliary\\Build`;
                if (fs.existsSync(path.join(vcDir, "vcvarsall.bat"))) {
                    core.exportVariable("VSINSTALLDIR", vsDir);
                    let vcvLine = [".\\vcvarsall.bat", this.vcArch()];
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
exports.MsvcPlatform = MsvcPlatform;
class MingwPlatform extends WindowsPlatform {
    constructor(platform, version) {
        super(platform, version);
        this.isX64 = (platform == "mingw73_64");
    }
    makeName() {
        return "mingw32-make";
    }
    setupInstallDir(toolPath) {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }
    addExtraEnvVars(basePath) {
        core.addPath(path.join(basePath, "mingw", "bin"));
    }
    extraPackages() {
        if (this.isX64)
            return ["qt.tools.win64_mingw73"];
        else
            return ["qt.tools.win32_mingw73"];
    }
    runInstaller(tool, args, instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runQtInstaller(tool, args);
            const mingwPath = path.join(instDir, this.version, this.platform, "mingw");
            if (this.isX64)
                yield io.mv(path.join(instDir, "Tools", "mingw730_64"), mingwPath);
            else
                yield io.mv(path.join(instDir, "Tools", "mingw730_32"), mingwPath);
        });
    }
    installPlatform() {
        if (this.isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
}
exports.MingwPlatform = MingwPlatform;
