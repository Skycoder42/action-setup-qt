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
const glob = __importStar(require("glob"));
const core = __importStar(require("@actions/core"));
const ex = __importStar(require("@actions/exec"));
const unixplatform_1 = require("./unixplatform");
class MacosPlatform extends unixplatform_1.UnixPlatform {
    addExtraEnvVars(_basePath) {
        core.addPath("/usr/local/opt/make/libexec/gnubin");
    }
    installerName() {
        return "qt-unified-mac-x64-online.dmg";
    }
    runPreInstaller(_cacheHit) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ex.exec("which", ["make"]);
            yield ex.exec("make", ["--version"]);
            yield ex.exec("brew", ["install", "make"]);
        });
    }
    runInstaller(tool, args, instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ex.exec("hdiutil", ["attach", tool]);
            const options = {};
            options.env = {
                "QT_QPA_PLATFORM": "minimal",
                "HOME": path.join(instDir, "..", 'home')
            };
            const vPath = glob.sync("/Volumes/qt-unified-mac-x64-*-online/qt-unified-mac-x64-*-online.app/Contents/MacOS/qt-unified-mac-x64-*-online")[0];
            yield ex.exec(vPath, args, options);
        });
    }
    runPostInstaller() {
        return __awaiter(this, void 0, void 0, function* () {
            yield ex.exec("which", ["make"]);
            yield ex.exec("make", ["--version"]);
        });
    }
}
exports.MacosPlatform = MacosPlatform;
