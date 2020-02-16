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
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const ex = __importStar(require("@actions/exec"));
class Extractor {
    constructor(path, version, platform) {
        this._path = path;
        this._version = version;
        this._platform = platform;
        core.debug(`Installting Qt at path: ${this._path}`);
    }
    extractAll(archives) {
        return __awaiter(this, void 0, void 0, function* () {
            core.info(`Extracting archives to ${this._path}...`);
            for (const archive of archives)
                yield this.extract(archive);
            yield this.writeConfigs();
        });
    }
    writeConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            core.info("Writing configuration files...");
            const writeFile = util_1.default.promisify(fs_1.default.writeFile);
            const appendFile = util_1.default.promisify(fs_1.default.appendFile);
            // write qt.conf
            core.debug("Writing bin/qt.conf...");
            yield writeFile(path_1.default.join(this.fullPath(), "bin", "qt.conf"), "[Paths]\nPrefix=..\n", "utf-8");
            // update qconfig.pri
            core.debug("Writing mkspecs/qconfig.pri...");
            yield appendFile(path_1.default.join(this.fullPath(), "mkspecs", "qconfig.pri"), "QT_EDITION = OpenSource\nQT_LICHECK = \n");
        });
    }
    extract(archive) {
        return __awaiter(this, void 0, void 0, function* () {
            yield io.mkdirP(this._path);
            const szPath = yield io.which("7z");
            core.debug(`Extracting archive ${path_1.default.basename(archive)}...`);
            yield ex.exec(szPath, ['x', '-bb1', '-bd', '-y', '-sccUTF-8', archive], {
                cwd: this._path,
                silent: true
            });
        });
    }
    fullPath() {
        return path_1.default.join(this._path, this._version.toString(), this._platform);
    }
}
exports.default = Extractor;
