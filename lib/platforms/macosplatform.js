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
const core = __importStar(require("@actions/core"));
const ex = __importStar(require("@actions/exec"));
const unixplatform_1 = __importDefault(require("./unixplatform"));
class MacosPlatform extends unixplatform_1.default {
    addExtraEnvVars(basePath) {
        super.addExtraEnvVars(basePath);
        core.addPath("/usr/local/opt/make/libexec/gnubin");
    }
    runPreInstall() {
        const _super = Object.create(null, {
            runPreInstall: { get: () => super.runPreInstall }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.runPreInstall.call(this);
            yield ex.exec("brew", ["update"]);
            yield ex.exec("brew", ["install", "make", "p7zip"]);
        });
    }
}
exports.default = MacosPlatform;
