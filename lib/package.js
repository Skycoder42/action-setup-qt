"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Package {
    constructor(data, baseUrl) {
        this._xmlData = data;
        this._url = baseUrl;
    }
    get url() {
        return this._url;
    }
    set url(v) {
        this._url = v;
    }
    get name() {
        return this._xmlData.Name;
    }
    get archives() {
        if (typeof this._xmlData.DownloadableArchives !== 'string')
            return [];
        else {
            return this._xmlData.DownloadableArchives
                .split(',')
                .map(d => d.trim());
        }
    }
    dependencies(platform) {
        if (typeof this._xmlData.Dependencies !== 'string')
            return [];
        else {
            return this._xmlData.Dependencies
                .split(',')
                .map(d => d.trim())
                .filter(d => d.includes(platform));
        }
    }
    dlPath(archive) {
        return this._xmlData.Name + '/' + this._xmlData.Version + archive;
    }
    shaPath(archive) {
        return this.dlPath(archive + ".sha1");
    }
}
exports.default = Package;
