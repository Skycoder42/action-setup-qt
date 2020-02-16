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
const path_1 = __importDefault(require("path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const windowsplatform_1 = __importDefault(require("./windowsplatform"));
class MingwPlatform extends windowsplatform_1.default {
    constructor(platform, version) {
        super(platform, version);
        this._isX64 = (platform == "mingw73_64");
    }
    installPlatform() {
        if (this._isX64)
            return "win64_mingw73";
        else
            return "win32_mingw73";
    }
    makeName() {
        return "mingw32-make";
    }
    installDirs(toolPath) {
        const instDir = `${toolPath.substr(0, 2)}\\Users\\runneradmin\\install`;
        return [instDir, instDir.substr(2).replace(/\\/g, "/")];
    }
    addExtraEnvVars(basePath) {
        super.addExtraEnvVars(basePath);
        core.addPath(path_1.default.join(basePath, "mingw", "bin"));
    }
    extraTools() {
        const tools = super.extraTools();
        if (this._isX64)
            return [...tools, "qt.tools.win64_mingw730"];
        else
            return [...tools, "qt.tools.win32_mingw730"];
    }
    runPostInstall(cached, instDir) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runPostInstall(cached, instDir);
            if (!cached) {
                const mingwPath = path_1.default.join(instDir, "mingw");
                yield io.rmRF(mingwPath);
                if (this._isX64)
                    yield io.mv(path_1.default.join(instDir, "Tools", "mingw730_64"), mingwPath);
                else
                    yield io.mv(path_1.default.join(instDir, "Tools", "mingw730_32"), mingwPath);
            }
        });
    }
}
exports.default = MingwPlatform;
