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
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const util_1 = __importDefault(require("util"));
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const ex = __importStar(require("@actions/exec"));
const tc = __importStar(require("@actions/tool-cache"));
const package_1 = __importDefault(require("./package"));
class Downloader {
    constructor(os, arch, version, platform) {
        this._version = version;
        this._platform = platform;
        this._host = os + '_' + arch;
        this._packages = new Map();
        this._downloads = ["__default"];
    }
    addQtSource() {
        return __awaiter(this, void 0, void 0, function* () {
            const qtUrl = new url_1.URL("https://download.qt.io/online/qtsdkrepository/");
            // standard source
            yield this.addSource(qtUrl, true);
            // add tool sources
            yield this.addToolSource(qtUrl, "qtcreator");
            yield this.addToolSource(qtUrl, "qtcreator_preview");
            yield this.addToolSource(qtUrl, "openssl_x64");
            yield this.addToolSource(qtUrl, "openssl_x86");
            yield this.addToolSource(qtUrl, "openssl_src");
            yield this.addToolSource(qtUrl, "ninja");
            yield this.addToolSource(qtUrl, "maintenance");
            yield this.addToolSource(qtUrl, "ifw");
            yield this.addToolSource(qtUrl, "generic");
            yield this.addToolSource(qtUrl, "cmake");
            yield this.addToolSource(qtUrl, "vcredist");
            yield this.addToolSource(qtUrl, "mingw");
        });
    }
    addSource(url, deep) {
        return __awaiter(this, void 0, void 0, function* () {
            const subPath = [this._host];
            if (deep) {
                subPath.push(this.getTarget());
                subPath.push(this.getVersionPath());
            }
            else
                subPath.push("qt" + this._version.toString(""));
            const sourceUrl = new url_1.URL(subPath.join('/') + '/', url);
            core.debug(`Downloading Updates.xml for subPath ${subPath} from ${url}`);
            const reply = yield this.get(new url_1.URL("Updates.xml", sourceUrl), "text/xml");
            const update = fast_xml_parser_1.default.parse(reply);
            const filtered = update.Updates.PackageUpdate
                .filter(x => x.Name.endsWith("." + this._platform));
            core.debug(`Downloaded ${filtered.length} valid module configurations from ${url}`);
            filtered.reduce((map, x) => map.set(this.stripPackageName(x.Name), new package_1.default(x, sourceUrl)), this._packages);
        });
    }
    addToolSource(url, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const subPath = [
                    this._host,
                    "desktop",
                    "tools_" + type
                ];
                const sourceUrl = new url_1.URL(subPath.join('/') + '/', url);
                core.debug(`Downloading Updates.xml for subPath ${subPath} from ${url}`);
                const reply = yield this.get(new url_1.URL("Updates.xml", sourceUrl), "text/xml");
                const update = fast_xml_parser_1.default.parse(reply);
                core.debug(`Downloaded ${update.Updates.PackageUpdate.length} valid module configurations from ${url}`);
                update.Updates.PackageUpdate.reduce((map, x) => map.set(this.stripPackageName(x.Name), new package_1.default(x, sourceUrl)), this._packages);
                return true;
            }
            catch (error) {
                console.warn(`Failed to get tool sources for tool type "${type}" with error: ${error.message}`);
                return false;
            }
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
    installTo(basePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const archives = yield this.download();
            core.info(`Extracting archives to ${basePath}...`);
            for (const archive of archives)
                yield this.extract(basePath, archive);
            yield this.writeConfigs(basePath);
        });
    }
    getTarget() {
        if (this._platform.includes("android"))
            return "android";
        else if (this._platform.includes("winrt"))
            return "winrt";
        else if (this._platform.includes("ios"))
            return "ios";
        else
            return "desktop";
    }
    getVersionPath() {
        const basePath = "qt5_" + this._version.toString("");
        if (this._platform.includes("wasm"))
            return basePath + "_wasm";
        else
            return basePath;
    }
    stripPackageName(name) {
        if (name == `qt.qt5.${this._version.toString("")}.${this._platform}`)
            return "__default";
        else {
            const match = name.match(`^qt\\.qt5\\.${this._version.toString("")}\\.(.+)\\.${this._platform}$`);
            return match ? match[1] : name;
        }
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
                    const sha1sum = yield this.get(new url_1.URL(pkg.shaPath(archive), pkg.url));
                    const archiveUrl = new url_1.URL(pkg.dlPath(archive), pkg.url);
                    archiveUrl.protocol = "http";
                    const archivePath = yield tc.downloadTool(archiveUrl.toString());
                    if (!(yield this.verifyHashsum(archivePath, sha1sum)))
                        throw new Error(`Invalid sha1sum for archive ${archive}`);
                    result.push(archivePath);
                }
            }
            core.debug(`Completed download of ${result.length} packages`);
            return result;
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
    extract(basePath, archive) {
        return __awaiter(this, void 0, void 0, function* () {
            yield io.mkdirP(basePath);
            const szPath = yield io.which("7z", true);
            core.debug(`Extracting archive ${path_1.default.basename(archive)}...`);
            yield ex.exec(szPath, ['x', '-bb1', '-bd', '-y', '-sccUTF-8', archive], {
                cwd: basePath,
                silent: true
            });
        });
    }
    writeConfigs(basePath) {
        return __awaiter(this, void 0, void 0, function* () {
            core.info("Writing configuration files...");
            const writeFile = util_1.default.promisify(fs_1.default.writeFile);
            const appendFile = util_1.default.promisify(fs_1.default.appendFile);
            const fullPath = path_1.default.join(basePath, this._version.toString(), this._platform);
            // write qt.conf
            core.debug("Writing bin/qt.conf...");
            yield writeFile(path_1.default.join(fullPath, "bin", "qt.conf"), "[Paths]\nPrefix=..\n", "utf-8");
            // update qconfig.pri
            core.debug("Writing mkspecs/qconfig.pri...");
            yield appendFile(path_1.default.join(fullPath, "mkspecs", "qconfig.pri"), "QT_EDITION = OpenSource\nQT_LICHECK = \n", "utf-8");
        });
    }
    get(url, contentType = null) {
        return __awaiter(this, void 0, void 0, function* () {
            core.debug(`Requesting GET ${url}`);
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
}
;
exports.default = Downloader;
