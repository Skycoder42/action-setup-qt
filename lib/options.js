"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParam = void 0;
const core_1 = require("@actions/core");
const versionnumber_1 = __importDefault(require("./versionnumber"));
const parseList = (list, seperator) => list
    .split(seperator)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
const parsers = {
    ["version" /* Version */]: (v) => versionnumber_1.default.fromString(v),
    ["platform" /* Platform */]: (v) => v,
    ["packages" /* Packages */]: (v) => parseList(v, ","),
    ["deep-sources" /* DeepSources */]: (v) => parseList(v, " "),
    ["flat-sources" /* FlatSources */]: (v) => parseList(v, " "),
    ["cache-mode" /* CacheMode */]: (v) => v,
    ["clean" /* Clean */]: (v) => v === "true",
};
const getParser = (key) => {
    return parsers[key];
};
exports.getParam = (key, required) => {
    const input = core_1.getInput(key, { required });
    return getParser(key)(input);
};
