"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class VersionNumber {
    constructor(...segments) {
        this._segments = [...segments];
    }
    get segments() {
        return this._segments;
    }
    set segments(v) {
        this._segments = v;
    }
    get length() {
        return this._segments.length;
    }
    get major() {
        return this._segments.length > 0 ? this._segments[0] : 0;
    }
    set major(v) {
        this._segments = [v, ...this._segments.slice(1)];
    }
    get minor() {
        return this._segments.length > 1 ? this._segments[1] : 0;
    }
    set minor(v) {
        this._segments = [...this._segments.slice(0, 1), v, ...this._segments.slice(2)];
    }
    get patch() {
        return this._segments.length > 2 ? this._segments[2] : 0;
    }
    set patch(v) {
        this._segments = [...this._segments.slice(0, 2), v, ...this._segments.slice(3)];
    }
    toString(seperator = '.') {
        return this._segments.join(seperator);
    }
    static fromString(vString, seperator = '.') {
        return new VersionNumber(...vString.split(seperator).map(s => Number(s)));
    }
}
exports.default = VersionNumber;
