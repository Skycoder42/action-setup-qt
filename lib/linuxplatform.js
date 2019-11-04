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
const os = __importStar(require("os"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const ex = __importStar(require("@actions/exec"));
const unixplatform_1 = require("./unixplatform");
class LinuxPlatform extends unixplatform_1.UnixPlatform {
    installerName() {
        return `qt-unified-linux-${os.arch()}-online.run`;
    }
    runInstaller(tool, args, instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ex.exec("sudo", ["apt-get", "-qq", "install", "libgl1-mesa-dev"]);
            yield fs_1.promises.chmod(tool, 0o755);
            const options = {};
            options.env = {
                "QT_QPA_PLATFORM": "minimal",
                "HOME": path.join(instDir, "..", 'home')
            };
            yield ex.exec(tool, args, options);
        });
    }
}
exports.LinuxPlatform = LinuxPlatform;
class AndroidPlatform extends LinuxPlatform {
    addExtraEnvVars(basePath) {
        console.log(process.env);
        core.exportVariable("ANDROID_SDK_ROOT", String(process.env["ANDROID_HOME"]));
        core.exportVariable("ANDROID_NDK_ROOT", path.join(String(process.env["ANDROID_HOME"]), "ndk-bundle"));
    }
}
exports.AndroidPlatform = AndroidPlatform;
