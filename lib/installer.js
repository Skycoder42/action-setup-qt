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
const fssync = __importStar(require("fs"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const ex = __importStar(require("@actions/exec"));
const linuxplatform_1 = require("./linuxplatform");
const windowsplatform_1 = require("./windowsplatform");
const macosplatform_1 = require("./macosplatform");
const qtScript = __importStar(require("./qt-installer-script-base"));
class Installer {
    constructor(version, platform) {
        this.tempDir = this.initTempDir(platform);
        this.version = version;
        switch (os.platform()) {
            case "linux":
                if (platform.includes("android"))
                    this.platform = new linuxplatform_1.AndroidPlatform(platform);
                else
                    this.platform = new linuxplatform_1.LinuxPlatform(platform);
                break;
            case "win32":
                if (platform.includes("mingw"))
                    this.platform = new windowsplatform_1.MingwPlatform(platform, version);
                else
                    this.platform = new windowsplatform_1.MsvcPlatform(platform, version);
                break;
            case "darwin":
                this.platform = new macosplatform_1.MacosPlatform(platform);
                break;
            default:
                throw `Install platform ${os.platform()} is not supported by this action`;
        }
    }
    getQt(packages, iArgs, cached) {
        return __awaiter(this, void 0, void 0, function* () {
            // install qdep
            const pythonPath = yield io.which('python', true);
            core.debug(`Using python: ${pythonPath}`);
            yield ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
            core.info("Installed qdep");
            // check caches for Qt installation
            let toolPath = null;
            if (cached && fssync.existsSync(path.join(cached, "bin", this.platform.qmakeName())))
                toolPath = yield tc.cacheDir(cached, 'qt', this.version, this.platform.platform);
            else
                toolPath = tc.find('qt', this.version, this.platform.platform);
            // download, extract, cache
            if (!toolPath) {
                yield this.platform.runPreInstaller(false);
                toolPath = yield this.acquireQt(packages, iArgs);
                core.debug('Qt installation is cached under ' + toolPath);
            }
            else
                yield this.platform.runPreInstaller(true);
            // update output / env vars
            core.setOutput("qtdir", toolPath);
            core.addPath(path.join(toolPath, "bin"));
            this.platform.addExtraEnvVars(toolPath);
            // run post installer
            yield this.platform.runPostInstaller();
            yield ex.exec("qmake", ["-version"]);
            yield ex.exec("qmake", ["-query"]);
            // set outputs
            core.setOutput("tests", String(this.shouldTest()));
            core.setOutput("testflags", this.platform.testFlags());
            // set install dir, create artifact symlink
            const iPath = this.platform.setupInstallDir();
            yield io.mkdirP(iPath[0]);
            yield fs_1.promises.symlink(path.join(iPath[0], os.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), ".."), "install_link", 'dir');
            core.setOutput('installdir', iPath[1]);
        });
    }
    initTempDir(platform) {
        let tempDirectory = process.env['RUNNER_TEMP'] || '';
        if (!tempDirectory) {
            let baseLocation;
            if (platform == "win32") {
                // On windows use the USERPROFILE env variable
                baseLocation = process.env['USERPROFILE'] || 'C:\\';
            }
            else {
                if (platform === 'darwin')
                    baseLocation = '/Users';
                else
                    baseLocation = '/home';
            }
            tempDirectory = path.join(baseLocation, 'actions', 'temp');
        }
        return tempDirectory;
    }
    acquireQt(packages, iArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            // download the installer
            const downloadPath = yield tc.downloadTool(`https://download.qt.io/official_releases/online_installers/${this.platform.installerName()}`);
            // create the script and run the installer
            const installPath = path.join(this.tempDir, 'qt');
            const scriptPath = path.join(this.tempDir, 'qt-installer-script.qs');
            yield fs_1.promises.mkdir(path.join(this.tempDir, 'home'));
            yield fs_1.promises.writeFile(scriptPath, this.generateScript(installPath, packages));
            yield this.platform.runInstaller(downloadPath, ["--script", scriptPath].concat(iArgs.split(" ")), installPath);
            core.info(`Installed Qt ${this.version} for ${this.platform.platform}`);
            // add qdep prf file
            const qmakePath = path.join(installPath, this.version, this.platform.platform, "bin", this.platform.qmakeName());
            const qdepPath = yield io.which('qdep', true);
            yield ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
            core.info("Successfully prepared qdep");
            // install into the local tool cache
            return yield tc.cacheDir(path.join(installPath, this.version, this.platform.platform), 'qt', this.version, this.platform.platform);
        });
    }
    generateScript(path, packages) {
        const qtVer = this.version.replace(/\./g, "");
        let modules = [`qt.qt5.${qtVer}.${this.platform.installPlatform()}`];
        for (let entry of packages.split(","))
            modules.push(`qt.qt5.${qtVer}.${entry}`);
        const extraPkgs = this.platform.extraPackages();
        if (extraPkgs)
            modules = modules.concat(extraPkgs);
        return qtScript.generateScript(path, modules);
    }
    shouldTest() {
        const platform = this.platform.platform;
        if (platform.includes("android") ||
            platform.includes("wasm") ||
            platform.includes("winrt") ||
            platform.includes("ios"))
            return false;
        else
            return true;
    }
}
exports.Installer = Installer;
