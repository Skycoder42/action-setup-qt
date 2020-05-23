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
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
const url_1 = require("url");
const util_1 = require("util");
const core_1 = require("@actions/core");
const io_1 = require("@actions/io");
const exec_1 = require("@actions/exec");
const cache_1 = require("@actions/cache");
const linuxplatform_1 = __importDefault(require("./platforms/linuxplatform"));
const androidplatform_1 = __importDefault(require("./platforms/androidplatform"));
const mingwplatform_1 = __importDefault(require("./platforms/mingwplatform"));
const msvcplatform_1 = __importDefault(require("./platforms/msvcplatform"));
const macosplatform_1 = __importDefault(require("./platforms/macosplatform"));
const downloader_1 = __importDefault(require("./downloader"));
const versionnumber_1 = __importDefault(require("./versionnumber"));
const exists = util_1.promisify(fs_1.exists);
let Installer = /** @class */ (() => {
    class Installer {
        constructor(version, platform) {
            this._tempDir = this.initTempDir(os_1.platform());
            this._version = versionnumber_1.default.fromString(version);
            let host;
            let arch;
            switch (os_1.platform()) {
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
                    throw `Install platform ${os_1.platform()} is not supported by this action`;
            }
            this._cacheKey = `qt_${host}_${arch}_${this._platform.platform}_${version}`;
            this._downloader = new downloader_1.default(host, arch, this._version, this._platform.platform, this._platform.installPlatform());
        }
        getQt(packages, deepSrc, flatSrc, clean) {
            return __awaiter(this, void 0, void 0, function* () {
                // install qdep (don't cache to always get the latest version)
                yield this.installQdep();
                // run pre install
                yield this._platform.runPreInstall();
                // try to get Qt from cache, unless clean is specified
                let toolPath = null;
                if (clean != "true") {
                    core_1.debug(`Trying to restore Qt from cache with key: ${this._cacheKey} `);
                    const hitKey = yield cache_1.restoreCache([Installer.CacheDir], this._cacheKey);
                    if (hitKey && (yield exists(path_1.join(Installer.CacheDir, "bin", this._platform.qmakeName())))) {
                        toolPath = path_1.resolve(Installer.CacheDir);
                        core_1.debug(`Restored Qt from cache to path: ${toolPath}`);
                    }
                }
                // download, extract, cache
                if (!toolPath) {
                    core_1.debug('Downloading and installing Qt');
                    toolPath = yield this.acquireQt(this.parseList(packages, ','), this.parseList(deepSrc, ' '), this.parseList(flatSrc, ' '));
                    core_1.debug(`Caching Qt with key: ${this._cacheKey}`);
                    yield this._platform.runPostInstall(false, toolPath);
                    try {
                        yield cache_1.saveCache([toolPath], this._cacheKey);
                    }
                    catch ({ message }) {
                        core_1.warning(`Failed to save cache with error: ${message}`);
                    }
                }
                else
                    yield this._platform.runPostInstall(true, toolPath);
                core_1.info('Using Qt installation: ' + toolPath);
                // generate qdep prf
                yield this.generateQdepPrf(toolPath);
                // update output / env vars
                core_1.setOutput("qtdir", toolPath);
                core_1.addPath(path_1.join(toolPath, "bin"));
                this._platform.addExtraEnvVars(toolPath);
                // log stuff
                yield exec_1.exec("qmake", ["-version"]);
                yield exec_1.exec("qmake", ["-query"]);
                // set outputs
                core_1.setOutput("shell", this._platform.shellName());
                core_1.setOutput("make", this._platform.makeName());
                core_1.setOutput("tests", String(this.shouldTest()));
                core_1.setOutput("testflags", this._platform.testFlags());
                // set install dir, create artifact symlink
                const iPath = this._platform.installDirs(toolPath);
                yield io_1.mkdirP(iPath[0]);
                const instPath = path_1.join(iPath[0], os_1.platform() == "win32" ? toolPath.substr(3) : toolPath.substr(1), "..", "..");
                core_1.setOutput('outdir', instPath);
                core_1.setOutput('installdir', iPath[1]);
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
                tempDirectory = path_1.join(baseLocation, 'actions', 'temp');
            }
            return tempDirectory;
        }
        installQdep() {
            return __awaiter(this, void 0, void 0, function* () {
                const pythonPath = yield io_1.which('python', true);
                core_1.debug(`Using python: ${pythonPath}`);
                yield exec_1.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
                const qdepPath = yield io_1.which('qdep', true);
                yield exec_1.exec(qdepPath, ["--version"]);
                core_1.info("Installed qdep");
            });
        }
        acquireQt(packages, deepSrc, flatSrc) {
            return __awaiter(this, void 0, void 0, function* () {
                // download source definitions
                yield this._downloader.addQtSource();
                for (const src of deepSrc)
                    yield this._downloader.addSource(new url_1.URL(src), true);
                for (const src of flatSrc)
                    yield this._downloader.addSource(new url_1.URL(src), false);
                // add packages
                core_1.debug(`Available modules: ${this._downloader.modules().join(", ")}`);
                for (const pkg of this._platform.extraTools())
                    this._downloader.addDownload(pkg, true);
                for (const pkg of packages)
                    this._downloader.addDownload(pkg, true);
                // download and install
                const installPath = path_1.join(this._tempDir, 'qt');
                yield this._downloader.installTo(installPath);
                const dataPath = path_1.join(installPath, this._version.toString(), this._platform.platform);
                // move tools
                const oldToolPath = path_1.join(installPath, "Tools");
                if (yield exists(oldToolPath))
                    yield io_1.mv(oldToolPath, path_1.join(dataPath, "Tools"));
                // move out of install dir to seperate dir
                yield io_1.rmRF(Installer.CacheDir);
                yield io_1.mv(dataPath, Installer.CacheDir);
                // remove tmp installation to free some space
                yield io_1.rmRF(installPath);
                return Installer.CacheDir;
            });
        }
        generateQdepPrf(installPath) {
            return __awaiter(this, void 0, void 0, function* () {
                // add qdep prf file
                const qmakePath = path_1.join(installPath, "bin", this._platform.qmakeName());
                const qdepPath = yield io_1.which('qdep', true);
                yield exec_1.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
                core_1.info("Successfully prepared qdep");
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
    Installer.CacheDir = path_1.join(".cache", "qt");
    return Installer;
})();
exports.default = Installer;
