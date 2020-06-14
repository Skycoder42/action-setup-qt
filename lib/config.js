"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const core_1 = require("@actions/core");
const versionnumber_1 = __importDefault(require("./versionnumber"));
const parseList = (list, seperator) => list
    .split(seperator)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
exports.loadConfig = () => {
    const config = {
        version: versionnumber_1.default.fromString(core_1.getInput("version", { required: true })),
        platform: core_1.getInput("platform", { required: true }),
        packages: parseList(core_1.getInput("platform"), ","),
        deepSources: parseList(core_1.getInput("deep-sources"), " "),
        flatSources: parseList(core_1.getInput("flat-sources"), " "),
        cacheMode: core_1.getInput("cache-mode"),
        clean: core_1.getInput("clean") === "true",
    };
    core_1.debug(`Using config: ${JSON.stringify(config, undefined, 2)}`);
    return config;
};
