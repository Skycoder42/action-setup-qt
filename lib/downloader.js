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
const https_1 = __importDefault(require("https"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const package_1 = __importDefault(require("./package"));
class Downloader {
    constructor(os, arch, version, platform) {
        this._packages = null;
        this._version = version;
        this._platform = platform;
        this._target = [
            os + '_' + arch,
            Downloader.getDevSystem(platform),
            Downloader.getVersionPath(platform, version)
        ].join('/');
        this._packages = new Map();
        this._downloads = [];
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            core.debug(`Downloading Updates.xml for target ${this._target}`);
            const reply = yield this.get(this.downloadUrl("Updates.xml"), "text/xml");
            const update = fast_xml_parser_1.default.parse(reply);
            this._packages = update.Updates.PackageUpdate
                .filter(x => x.Version.startsWith(this._version.toString()))
                .filter(x => x.Name.endsWith("." + this._platform))
                .reduce((map, x) => map.set(this.stripPackageName(x.Name), new package_1.default(x)), new Map());
            this._downloads = ["__default"];
            core.debug(`Downloaded ${this._packages.size} module configurations`);
        });
    }
    modules() {
        if (!this._packages)
            throw new Error("Must call initialize before accessing any other members of Downloader");
        return Array.from(this._packages.keys());
    }
    addDownload(name, required = true) {
        var _a;
        const pkg = (_a = this._packages) === null || _a === void 0 ? void 0 : _a.get(name);
        if (!pkg) {
            if (required)
                throw new Error(`Unable to download required Qt package "${name}"`);
            else {
                core.info(`Skipping optional module ${name} because it was not found in the module list`);
                return false;
            }
        }
        for (const dep of pkg.dependencies(this._platform)) {
            if (!this.addDownload(this.stripPackageName(dep), required)) {
                core.info(`Skipping optional module ${name} because at least one of its dependencies was not found`);
                return false;
            }
        }
        if (!this._downloads.includes(name)) {
            this._downloads.push(name);
            core.info(`Added module ${name} to be installed`);
        }
        else
            core.debug(`Module ${name} has already been added`);
        return true;
    }
    download() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const result = [];
            core.info(`Downloading install archives for ${this._downloads.length} modules...`);
            for (const name of this._downloads) {
                const pkg = (_a = this._packages) === null || _a === void 0 ? void 0 : _a.get(name);
                if (!pkg)
                    throw new Error(`Unable to download required Qt package "${name}"`);
                for (const archive of pkg.archives) {
                    const sha1sum = yield this.get(this.downloadUrl(pkg.shaPath(archive)));
                    const archivePath = yield tc.downloadTool(this.downloadUrl(pkg.dlPath(archive), false), "/tmp/tst-setup-qt/downloads/" + archive);
                    if (!(yield this.verifyHashsum(archivePath, sha1sum)))
                        throw new Error(`Invalid sha1sum for archive ${archive}`);
                    result.push(archivePath);
                }
            }
            core.debug(`Completed download of ${result.length} packages`);
            return result;
        });
    }
    static getDevSystem(platform) {
        if (platform.includes("android"))
            return "android";
        else if (platform.includes("winrt"))
            return "winrt";
        else if (platform.includes("ios"))
            return "ios";
        else
            return "desktop";
    }
    static getVersionPath(platform, version) {
        const basePath = "qt5_" + version.toString("");
        if (platform.includes("wasm"))
            return basePath + "_wasm";
        else
            return basePath;
    }
    stripPackageName(name) {
        if (name == `qt.qt5.${this._version.toString("")}.${this._platform}`)
            return "__default";
        else {
            const match = name.match(`qt\\.qt5\\.${this._version.toString("")}\\.(\\w+)\\.${this._platform}`);
            return match ? match[1] : name;
        }
    }
    downloadUrl(path, https = true) {
        return `${https ? "https" : "http"}://download.qt.io/online/qtsdkrepository/${this._target}/${path}`;
    }
    get(url, contentType = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                https_1.default.get(url, res => {
                    try {
                        if (!res.statusCode || res.statusCode >= 300)
                            throw new Error(`Request failed with status code ${res.statusCode}`);
                        if (contentType && res.headers['content-type'] != contentType)
                            throw new Error(`Request failed with invalid content type "${res.headers['content-type']}"`);
                        res.setEncoding("utf-8");
                        let rawData = '';
                        res.on('error', e => reject(e));
                        res.on('data', (chunk) => { rawData += chunk; });
                        res.on('end', () => resolve(rawData));
                    }
                    catch (error) {
                        res.resume();
                        reject(error);
                    }
                });
            });
        });
    }
    verifyHashsum(path, sha1sum) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    const hasher = crypto_1.default.createHash('sha1');
                    const stream = fs_1.default.createReadStream(path);
                    stream.on('error', e => reject(e));
                    stream.on('data', chunk => hasher.update(chunk));
                    stream.on('end', () => resolve(hasher.digest('hex').toLowerCase() == sha1sum));
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
}
;
exports.default = Downloader;
