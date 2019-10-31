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
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const ex = __importStar(require("@actions/exec"));
const os = __importStar(require("os"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const qtScript = __importStar(require("./qt-installer-script-base"));
let osPlat = os.platform();
let osArch = os.arch();
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin') {
            baseLocation = '/Users';
        }
        else {
            baseLocation = '/home';
        }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function getQt(version, platform, pPackages, gPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        // check cache
        let toolPath;
        toolPath = tc.find('qt', version, platform);
        if (!toolPath) {
            // download, extract, cache
            toolPath = yield acquireQt(version, platform, pPackages, gPackages);
            core.debug('Qt installation is cached under ' + toolPath);
        }
        core.addPath(path.join(toolPath, version, platform, "bin"));
    });
}
exports.getQt = getQt;
function acquireQt(version, platform, pPackages, gPackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileName = getFileName(version);
        const downloadUrl = util.format('https://download.qt.io/official_releases/online_installers/%s', fileName);
        let downloadPath = null;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (error) {
            core.debug(error);
            throw `Failed to download version ${version}: ${error}`;
        }
        //
        // Run the installer
        //
        const installPath = path.join(tempDirectory, 'qt');
        const scriptPath = path.join(tempDirectory, 'qt-installer-script.qs');
        try {
            fs_1.promises.writeFile(scriptPath, qtScript.generateScript(installPath, version, platform, pPackages, gPackages));
        }
        catch (error) {
            core.debug(error);
            throw `Failed to download version ${version}: ${error}`;
        }
        if (osPlat == "win32") {
        }
        else if (osPlat == "linux") {
            yield fs_1.promises.chmod(downloadPath, 0o755);
            yield ex.exec(downloadPath, ["--script", scriptPath, "--addRepository", "https://install.skycoder42.de/qtmodules/linux_x64", "--verbose"]);
        }
        else if (osPlat == "darwin") {
        }
        //
        // Install into the local tool cache
        //
        return yield tc.cacheDir(installPath, 'qt', version, platform);
    });
}
function getFileName(version) {
    let platform;
    let arch;
    let ext;
    if (osPlat == "win32") {
        platform = "windows";
        arch = "x86";
        ext = "exe";
    }
    else if (osPlat == "linux") {
        platform = "linux";
        arch = osArch;
        ext = "run";
    }
    else if (osPlat == "darwin") {
        platform = "mac";
        arch = "x64";
        ext = "dmg";
    }
    else {
        let error = "Unsupported host platform";
        core.debug(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    const filename = util.format('qt-unified-%s-%s-online.%s', platform, arch, ext);
    return filename;
}