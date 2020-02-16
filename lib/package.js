"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Package {
    constructor(data) {
        this._xmlData = data;
    }
    get name() {
        return this._xmlData.Name;
    }
    get archives() {
        return this._xmlData.DownloadableArchives
            .split(',')
            .map(d => d.trim());
    }
    dependencies(platform) {
        return this._xmlData.Dependencies
            .split(',')
            .map(d => d.trim())
            .filter(d => d.includes(platform));
    }
    dlPath(archive) {
        return this._xmlData.Name + '/' + this._xmlData.Version + archive;
    }
    shaPath(archive) {
        return this.dlPath(archive + ".sha1");
    }
}
exports.default = Package;
