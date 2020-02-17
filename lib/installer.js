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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const fssync = __importStar(require("fs"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const ex = __importStar(require("@actions/exec"));
const linuxplatform_1 = __importDefault(require("./platforms/linuxplatform"));
const androidplatform_1 = __importDefault(require("./platforms/androidplatform"));
const mingwplatform_1 = __importDefault(require("./platforms/mingwplatform"));
const msvcplatform_1 = __importDefault(require("./platforms/msvcplatform"));
const macosplatform_1 = __importDefault(require("./platforms/macosplatform"));
const downloader_1 = __importDefault(require("./downloader"));
const versionnumber_1 = __importDefault(require("./versionnumber"));
const url_1 = require("url");
class Installer {
    constructor(version, platform) {
        this._tempDir = this.initTempDir(os.platform());
        this._version = versionnumber_1.default.fromString(version);
        let host;
        let arch;
        switch (os.platform()) {
            case "linux":
                if (platform.includes("android"))
                    this._platform = new androidplatform_1.default(platform);
                else
                    this._platform = new linuxplatform_1.default(platform);
                host = "linux";
                arch = "x64";
                break;
            case "win32":
                if (platform.includes("mingw"))
                    this._platform = new mingwplatform_1.default(platform, this._version);
                else
                    this._platform = new msvcplatform_1.default(platform, this._version);
                host = "windows";
                arch = "x86";
                break;
            case "darwin":
                this._platform = new macosplatform_1.default(platform);
                host = "mac";
                arch = "x64";
                break;
            default:
                throw `Install platform ${os.platform()} is not supported by this action`;
        }
        this._downloader = new downloader_1.default(host, arch, this._version, this._platform.platform, this._platform.installPlatform());
    }
    getQt(packages, deepSrc, flatSrc, cachedir, clean) {
        return __awaiter(this, void 0, void 0, function* () {
            // install qdep
            const pythonPath = yield io.which('python', true);
            core.debug(`Using python: ${pythonPath}`);
            yield ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
            core.info("Installed qdep");
            // check caches for Qt installation
            let toolPath = null;
            if (cachedir) {
                if (fssync.existsSync(path.join(cachedir, "bin", this._platform.qmakeName()))) {
                    toolPath = path.resolve(cachedir);
                    core.debug('Using globally cached Qt: ' + toolPath);
                }
            }
            else
                toolPath = tc.find('qt', this._version.toString(), this._platform.platform);
            // clean if required
            if (clean && toolPath) {
                yield io.rmRF(toolPath);
                toolPath = null;
            }
            // run pre install
            yield this._platform.runPreInstall();
            // download, extract, cache (if not cached yet)
            let cached;
            if (!toolPath) {
                cached = false;
                core.debug('Downloading and installing Qt');
                console.log(deepSrc, flatSrc);
                toolPath = yield this.acquireQt(this.parseList(packages, ','), this.parseList(deepSrc, ' '), this.parseList(flatSrc, ' '), cachedir);
            }
            else {
                cached = true;
                core.debug('Using locally cached Qt: ' + toolPath);
            }
            core.info('Using Qt installation: ' + toolPath);
            // update output / env vars
            core.setOutput("qtdir", toolPath);
            core.addPath(path.join(toolPath, "bin"));
            this._platform.addExtraEnvVars(toolPath);
            // run post installer
            yield this._platform.runPostInstall(cached, toolPath);
            // log stuff
            yield ex.exec("qmake", ["-version"]);
            yield ex.exec("qmake", ["-query"]);
            // set outputs
            core.setOutput("make", this._platform.makeName());
            core.setOutput("tests", String(this.shouldTest()));
            core.setOutput("testflags", this._platform.testFlags());
            // set install dir, create artifact symlink
            const iPath = this._platform.installDirs(toolPath);
            yield io.mkdirP(iPath[0]);
            const instPath = path.join(iPath[0], os.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), "..", "..");
            core.setOutput('outdir', instPath);
            core.setOutput('installdir', iPath[1]);
        });
    }
    parseList(list, seperator) {
        return list
            .split(seperator)
            .map(e => e.trim())
            .filter(e => e.length > 0);
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
    acquireQt(packages, deepSrc, flatSrc, cachedir) {
        return __awaiter(this, void 0, void 0, function* () {
            // download source definitions
            yield this._downloader.addQtSource();
            for (const src of deepSrc)
                yield this._downloader.addSource(new url_1.URL(src), true);
            for (const src of flatSrc)
                yield this._downloader.addSource(new url_1.URL(src), false);
            // add packages
            core.debug(`Available modules: ${this._downloader.modules().join(", ")}`);
            for (const pkg of this._platform.extraTools())
                this._downloader.addDownload(pkg, true);
            for (const pkg of packages)
                this._downloader.addDownload(pkg, true);
            // download and install
            const installPath = path.join(this._tempDir, 'qt');
            yield this._downloader.installTo(installPath);
            const dataPath = path.join(installPath, this._version.toString(), this._platform.platform);
            // add qdep prf file
            const qmakePath = path.join(dataPath, "bin", this._platform.qmakeName());
            const qdepPath = yield io.which('qdep', true);
            yield ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
            core.info("Successfully prepared qdep");
            // move tools
            yield io.mv(path.join(installPath, "Tools"), path.join(dataPath, "Tools"));
            // install into the local tool cache or global cache
            let resDir;
            if (cachedir) {
                yield io.mv(dataPath, cachedir);
                resDir = path.resolve(cachedir);
            }
            else
                resDir = yield tc.cacheDir(dataPath, 'qt', this._version.toString(), this._platform.platform);
            // remove tmp installation to free some space
            yield io.rmRF(installPath);
            return resDir;
        });
    }
    shouldTest() {
        const platform = this._platform.platform;
        if (platform.includes("android") ||
            platform.includes("wasm") ||
            platform.includes("winrt") ||
            platform.includes("ios"))
            return false;
        else
            return true;
    }
}
exports.default = Installer;
