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
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const ex = __importStar(require("@actions/exec"));
class WindowsPlatform {
    constructor(platform, version) {
        this.platform = platform;
        this.version = version;
    }
    addExtraEnvVars(basePath) { }
    extraPackages() {
        return null;
    }
    installerName() {
        return "qt-unified-windows-x86-online.exe";
    }
    runInstaller(tool, args, _instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            let exePath = tool + ".exe";
            yield io.mv(tool, exePath);
            yield ex.exec(exePath, args);
        });
    }
    qmakeName() {
        return "qmake.exe";
    }
}
exports.WindowsPlatform = WindowsPlatform;
class MsvcPlatform extends WindowsPlatform {
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
                throw `Unsupported platform ${this.platform}`;
        }
    }
}
exports.MsvcPlatform = MsvcPlatform;
class MingwPlatform extends WindowsPlatform {
    constructor(platform, version) {
        super(platform, version);
        this.isX64 = (platform == "mingw73_64");
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
        const _super = Object.create(null, {
            runInstaller: { get: () => super.runInstaller }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.runInstaller.call(this, tool, args, instDir);
            if (this.isX64)
                yield io.mv(path.join(instDir, "Tools", "mingw730_64"), path.join(instDir, this.version, this.platform, "mingw"));
            else
                yield io.mv(path.join(instDir, "Tools", "mingw730_32"), path.join(instDir, this.version, this.platform, "mingw"));
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