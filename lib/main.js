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
const core_1 = require("@actions/core");
const installer_1 = __importDefault(require("./installer"));
const options_1 = require("./options");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const installer = new installer_1.default(options_1.getParam("version" /* Version */), options_1.getParam("platform" /* Platform */));
            yield installer.getQt(options_1.getParam("packages" /* Packages */), options_1.getParam("deep-sources" /* DeepSources */), options_1.getParam("flat-sources" /* FlatSources */), options_1.getParam("clean" /* Clean */));
        }
        catch (e) {
            console.error(e);
            core_1.error(e.message);
            core_1.setFailed(e.message);
        }
    });
}
run();
