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
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const tc = __importStar(require("@actions/tool-cache"));
const ex = __importStar(require("@actions/exec"));
const os = __importStar(require("os"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const glob = __importStar(require("glob"));
const qtScript = __importStar(require("./qt-installer-script-base"));
let osPlat = os.platform();
let osArch = os.arch();
let tempDirectory = process.env['RUNNER_TEMP'] || '';
if (!tempDirectory) {
    let baseLocation;
    if (osArch == "win32") {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else {
        if (process.platform === 'darwin')
            baseLocation = '/Users';
        else
            baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
function getQt(version, platform, packages, iArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        // install qdep
        const pythonPath = yield io.which('python', true);
        yield ex.exec(pythonPath, ["-m", "pip", "install", "qdep"]);
        // check cache for Qt installation
        let toolPath = tc.find('qt', version, platform);
        if (!toolPath) {
            // download, extract, cache
            toolPath = yield acquireQt(version, platform, packages, iArgs);
            core.debug('Qt installation is cached under ' + toolPath);
        }
        core.addPath(path.join(toolPath, "bin"));
        core.addPath(path.join(toolPath, "mingw", "bin"));
        yield ex.exec("qmake", ["-version"]);
    });
}
exports.getQt = getQt;
function acquireQt(version, platform, packages, iArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileName = getFileName(version);
        const downloadUrl = util.format('https://download.qt.io/official_releases/online_installers/%s', fileName);
        let downloadPath = null;
        try {
            downloadPath = yield tc.downloadTool(downloadUrl);
        }
        catch (error) {
            console.log(error);
            throw `Failed to download version ${version}: ${error.message}`;
        }
        //
        // Run the installer
        //
        let installPath = path.join(tempDirectory, 'qt');
        const scriptPath = path.join(tempDirectory, 'qt-installer-script.qs');
        try {
            yield fs_1.promises.mkdir(path.join(tempDirectory, 'home'));
            console.log(qtScript.generateScript(installPath, version, installPlatform(platform), packages));
            yield fs_1.promises.writeFile(scriptPath, qtScript.generateScript(installPath, version, installPlatform(platform), packages));
        }
        catch (error) {
            console.log(error);
            throw `Failed to download version ${version}: ${error.message}`;
        }
        let instArgs = ["--script", scriptPath].concat(iArgs.split(" "));
        if (osPlat == "win32") {
            yield io.mv(downloadPath, downloadPath + ".exe");
            downloadPath = downloadPath + ".exe";
            yield ex.exec(downloadPath, instArgs);
        }
        else if (osPlat == "linux") {
            yield fs_1.promises.chmod(downloadPath, 0o755);
            const options = {};
            options.env = {
                "QT_QPA_PLATFORM": "minimal",
                "HOME": path.join(tempDirectory, 'home')
            };
            yield ex.exec(downloadPath, instArgs, options);
        }
        else if (osPlat == "darwin") {
            yield ex.exec("hdiutil", ["attach", downloadPath]);
            const options = {};
            options.env = {
                "QT_QPA_PLATFORM": "minimal",
                "HOME": path.join(tempDirectory, 'home')
            };
            const vPath = glob.sync("/Volumes/qt-unified-mac-x64-*-online/qt-unified-mac-x64-*-online.app/Contents/MacOS/qt-unified-mac-x64-*-online")[0];
            yield ex.exec(vPath, instArgs, options);
        }
        const qmakePath = path.join(installPath, version, platform, "bin", osPlat == "win32" ? "qmake.exe" : "qmake");
        yield ex.exec(qmakePath, ["-version"]);
        const qdepPath = yield io.which('qdep', true);
        yield ex.exec(qdepPath, ["prfgen", "--qmake", qmakePath]);
        if (platform == "mingw73_64")
            io.mv(path.join(installPath, "Tools", "mingw730_64"), path.join(installPath, version, platform, "mingw"));
        else if (platform == "mingw73_32")
            io.mv(path.join(installPath, "Tools", "mingw730_32"), path.join(installPath, version, platform, "mingw"));
        //
        // Install into the local tool cache
        //
        return yield tc.cacheDir(path.join(installPath, version, platform), 'qt', version, platform);
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
        console.log(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    const filename = util.format('qt-unified-%s-%s-online.%s', platform, arch, ext);
    return filename;
}
function installPlatform(platform) {
    if (osArch == "win32") {
        if (platform == "msvc2017_64")
            return "win64_msvc2017_64";
        else if (platform == "msvc2017")
            return "win32_msvc2017";
        else if (platform == "winrt_x64_msvc2017")
            return "win64_msvc2017_winrt_x64";
        else if (platform == "winrt_x86_msvc2017")
            return "win64_msvc2017_winrt_x86";
        else if (platform == "winrt_armv7_msvc2017")
            return "win64_msvc2017_winrt_armv7";
        else if (platform == "msvc2015_64")
            return "win64_msvc2015_64";
        else if (platform == "msvc2015")
            return "win32_msvc2015";
        else if (platform == "mingw73_64")
            return "win64_mingw73";
        else if (platform == "mingw73_32")
            return "win32_mingw73";
        else
            return platform;
    }
    else
        return platform;
}
